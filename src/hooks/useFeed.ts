import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@supabase/supabase-js";
import { posts as mockPosts, type Post } from "../data";
import { mapPost, type PostRow, type ProfileLite } from "../lib/db";
import { supabase, supabaseConfigured } from "../lib/supabase";

// posts の列一覧(embed なし)。sticker_emoji は後から追加した列なので、
// 古い DB に無い場合は自動で外して再取得する
const POST_SELECT =
  "id, user_id, image_url, caption, place_name, sticker_name, sticker_emoji, tone, likes_count, created_at";
const POST_SELECT_FALLBACK = POST_SELECT.replace(", sticker_emoji", "");

const PAGE_SIZE = 10;
// feed とは別に「自分の最新投稿」を取得してマージする件数。
// これにより自分の新着投稿は feed クエリの結果に関係なく必ず表示される。
const MY_RECENT = 5;

export function useFeed(session: Session | null) {
  const [posts, setPosts] = useState<Post[]>(supabaseConfigured ? [] : mockPosts);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(supabaseConfigured);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const lastIdRef = useRef<number | null>(null);
  // 同一ユーザーのセッション更新(TOKEN_REFRESHED 等)で再読み込みしないためのガード
  const userIdRef = useRef<string | null>(null);

  // posts クエリ共通部(sticker_emoji 列欠落時は自動フォールバック)
  const execPosts = useCallback(
    async (build: (q: any) => any): Promise<{ rows: PostRow[]; error: string | null }> => {
      const run = async (cols: string) => await build(supabase!.from("posts").select(cols));
      let { data, error } = await run(POST_SELECT);
      if (error && /sticker_emoji/i.test(error.message)) {
        ({ data, error } = await run(POST_SELECT_FALLBACK));
      }
      if (error) {
        console.error("posts query failed:", error.message);
        return { rows: [], error: error.message };
      }
      return { rows: ((data ?? []) as unknown) as PostRow[], error: null };
    },
    []
  );

  // user_id 一覧からプロフィールをバッチ取得(client-side join 用)
  const fetchProfiles = useCallback(async (ids: string[]): Promise<Map<string, ProfileLite>> => {
    const uniq = [...new Set(ids)];
    const map = new Map<string, ProfileLite>();
    if (uniq.length === 0) return map;
    const { data, error } = await supabase!
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", uniq);
    if (error) console.error("profiles query failed:", error.message);
    for (const p of ((data ?? []) as ProfileLite[])) map.set(p.id, p);
    return map;
  }, []);

  // 1 ページ取得(id 降順、afterId より古いもの)
  const fetchPage = useCallback(
    async (afterId: number | null) => {
      const { rows, error } = await execPosts((q: any) => {
        if (afterId != null) q = q.lt("id", afterId);
        return q.order("id", { ascending: false }).limit(PAGE_SIZE + 1);
      });
      if (error)
        return { rows: [] as PostRow[], hasNext: false, lastId: null as number | null, error };
      const hasNext = rows.length > PAGE_SIZE;
      const page = hasNext ? rows.slice(0, PAGE_SIZE) : rows;
      return {
        rows: page,
        hasNext,
        lastId: page.length ? page[page.length - 1].id : null,
        error: null as string | null,
      };
    },
    [execPosts]
  );

  // 行 + プロフィール → Post リスト
  const toPosts = useCallback(
    async (rows: PostRow[]): Promise<Post[]> => {
      const profiles = await fetchProfiles(rows.map((r) => r.user_id));
      return rows.map((r) => mapPost(r, profiles));
    },
    [fetchProfiles]
  );

  // 全件ロード:
  // 1) feed の先頭ページ + 自分の最新投稿 + 自分のいいね を同時取得
  // 2) 重複除去して id 降順にマージ(自分の新着は必ず入る)
  const loadFeed = useCallback(
    async (uid: string) => {
      setLoading(true);
      setError(null);
      const [page, mine, likes] = await Promise.all([
        fetchPage(null),
        execPosts((q: any) =>
          q.eq("user_id", uid).order("id", { ascending: false }).limit(MY_RECENT)
        ),
        supabase!.from("likes").select("post_id").eq("user_id", uid),
      ]);
      if (userIdRef.current !== uid) return; // ログアウト・ユーザー切替済みなら破棄
      if (page.error) {
        setError(page.error);
        setLoading(false);
        return;
      }
      if (mine.error) console.error("my recent posts failed:", mine.error);
      const seen = new Set<number>();
      const rows: PostRow[] = [];
      for (const r of [...mine.rows, ...page.rows]) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        rows.push(r);
      }
      rows.sort((a, b) => b.id - a.id);
      setPosts(await toPosts(rows));
      lastIdRef.current = page.lastId;
      setHasMore(page.hasNext);
      setLoading(false);
      if (likes.data)
        setLikedIds(new Set(((likes.data as { post_id: number }[]).map((r) => r.post_id))));
    },
    [fetchPage, execPosts, toPosts]
  );

  // 初回ロード / ログアウト時クリア。同一ユーザーのままなら再ロードしない
  useEffect(() => {
    if (!supabaseConfigured) return; // demo モードは mock のまま
    if (!supabase || !session) {
      userIdRef.current = null;
      setPosts([]);
      setLikedIds(new Set());
      setHasMore(false);
      lastIdRef.current = null;
      setLoading(false);
      setError(null);
      return;
    }
    if (userIdRef.current === session.user.id) return;
    userIdRef.current = session.user.id;
    loadFeed(session.user.id);
  }, [session, loadFeed]);

  const loadMore = useCallback(async () => {
    if (!supabase || !session || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { rows, hasNext, lastId, error } = await fetchPage(lastIdRef.current);
    if (error) {
      setError(error);
    } else {
      lastIdRef.current = lastId;
      setHasMore(hasNext);
      const more = await toPosts(rows);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...more.filter((p) => !seen.has(p.id))];
      });
    }
    setLoadingMore(false);
  }, [session, loadingMore, hasMore, fetchPage, toPosts]);

  const refresh = useCallback(async () => {
    if (!supabase || !session) return;
    setRefreshing(true);
    await loadFeed(session.user.id);
    setRefreshing(false);
  }, [session, loadFeed]);

  const toggleLike = useCallback(
    (postId: number) => {
      const liked = likedIds.has(postId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.delete(postId);
        else next.add(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes: String(Math.max(0, Number(p.likes) + (liked ? -1 : 1))) }
            : p
        )
      );
      if (supabase && session) {
        supabase.rpc("toggle_like", { p_post_id: postId });
      }
    },
    [likedIds, session]
  );

  // 投稿直後のローカル追加(重複は id で除去)
  const prependPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
    setError(null);
  }, []);

  // リアルタイム:新着投稿を自動で先頭に追加(自分の投稿は prepend と重複するので除去される)
  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    const channel = client
      .channel("feed-new-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const row = payload.new as { id: number };
          (async () => {
            const { rows, error } = await execPosts((q: any) => q.eq("id", row.id).limit(1));
            if (error || rows.length === 0) return;
            const [post] = await toPosts(rows);
            setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
          })();
        }
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [session, execPosts, toPosts]);

  return {
    posts,
    likedIds,
    loading,
    loadingMore,
    hasMore,
    refreshing,
    error,
    loadMore,
    refresh,
    toggleLike,
    prependPost,
  };
}
