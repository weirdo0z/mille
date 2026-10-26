import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@supabase/supabase-js";
import { posts as mockPosts, type Post } from "../data";
import { mapPost, fetchProfilesMap, type PostRow } from "../lib/db";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { toast } from "../lib/toast";

// posts の列一覧(embed なし)。sticker_emoji / comments_count は後から追加した列なので、
// 古い DB に無い場合は自動で外して再取得する
const POST_SELECT =
  "id, user_id, image_url, caption, place_name, sticker_name, sticker_emoji, tone, likes_count, comments_count, created_at";
const POST_SELECT_FALLBACK = POST_SELECT.replace(", sticker_emoji", "");
const POST_SELECT_FALLBACK2 = POST_SELECT_FALLBACK.replace(", comments_count", "");

const PAGE_SIZE = 10;
// feed とは別に「自分の最新投稿」を取得してマージする件数。
// これにより自分の新着投稿は feed クエリの結果に関係なく必ず表示される。
const MY_RECENT = 5;

export function useFeed(session: Session | null) {
  const [posts, setPosts] = useState<Post[]>(supabaseConfigured ? [] : mockPosts);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(supabaseConfigured);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const lastIdRef = useRef<number | null>(null);
  // 同一ユーザーのセッション更新(TOKEN_REFRESHED 等)で再読み込みしないためのガード
  const userIdRef = useRef<string | null>(null);

  // posts クエリ共通部(列欠落時は自動フォールバック)
  const execPosts = useCallback(
    async (build: (q: any) => any): Promise<{ rows: PostRow[]; error: string | null }> => {
      const run = async (cols: string) => await build(supabase!.from("posts").select(cols));
      const attempts = [POST_SELECT, POST_SELECT_FALLBACK, POST_SELECT_FALLBACK2];
      let data: PostRow[] | null = null;
      let error: { message: string } | null = null;
      for (const cols of attempts) {
        const res = await run(cols);
        if (!res.error) {
          data = res.data;
          error = null;
          break;
        }
        error = res.error;
        // 列欠落系エラーのみフォールバックを続行
        if (!/sticker_emoji|comments_count/i.test(res.error.message)) break;
      }
      if (error) {
        console.error("posts query failed:", error.message);
        return { rows: [], error: error.message };
      }
      return { rows: ((data ?? []) as unknown) as PostRow[], error: null };
    },
    []
  );

  // user_id 一覧からプロフィールをバッチ取得(client-side join 用)は db.ts の fetchProfilesMap を共用

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
  const toPosts = useCallback(async (rows: PostRow[]): Promise<Post[]> => {
    const profiles = await fetchProfilesMap(rows.map((r) => r.user_id));
    return rows.map((r) => mapPost(r, profiles));
  }, []);

  // 全件ロード:
  // 1) feed の先頭ページ + 自分の最新投稿 + 自分のいいね を同時取得
  // 2) 重複除去して id 降順にマージ(自分の新着は必ず入る)
  const loadFeed = useCallback(
    async (uid: string) => {
      setLoading(true);
      setError(null);
      const [page, mine, likes, saves, follows] = await Promise.all([
        fetchPage(null),
        execPosts((q: any) =>
          q.eq("user_id", uid).order("id", { ascending: false }).limit(MY_RECENT)
        ),
        supabase!.from("likes").select("post_id").eq("user_id", uid),
        supabase!.from("saves").select("post_id").eq("user_id", uid),
        supabase!.from("follows").select("followee_id").eq("follower_id", uid),
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
      if (saves.data)
        setSavedIds(new Set(((saves.data as { post_id: number }[]).map((r) => r.post_id))));
      if (follows.data)
        setFollowingIds(
          new Set(((follows.data as { followee_id: string }[]).map((r) => r.followee_id)))
        );
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
      setSavedIds(new Set());
      setFollowingIds(new Set());
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

  // いいね/解除:楽観更新 → await で落庫(supabase-js は await しないとリクエストが送られない)
  // 失敗時は楽観更新を巻き戻してトースト表示
  const toggleLike = useCallback(
    async (postId: number) => {
      const liked = likedIds.has(postId);
      const apply = (state: boolean) => {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (state) next.add(postId);
          else next.delete(postId);
          return next;
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likes: String(Math.max(0, Number(p.likes) + (state ? 1 : -1))) }
              : p
          )
        );
      };
      apply(!liked);
      if (supabase && session) {
        const { error } = await supabase.rpc("toggle_like", { p_post_id: postId });
        if (error) {
          console.error("toggle_like failed:", error.message);
          apply(liked);
          toast("いいねに失敗しました");
        }
      }
    },
    [likedIds, session]
  );

  // 保存/解除(楽観更新 → await で落庫;失敗時は巻き戻し)
  const toggleSave = useCallback(
    async (postId: number) => {
      const saved = savedIds.has(postId);
      const apply = (state: boolean) => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (state) next.add(postId);
          else next.delete(postId);
          return next;
        });
      };
      apply(!saved);
      if (supabase && session) {
        const { error } = saved
          ? await supabase
              .from("saves")
              .delete()
              .eq("post_id", postId)
              .eq("user_id", session.user.id)
          : await supabase
              .from("saves")
              .insert({ post_id: postId, user_id: session.user.id });
        if (error) {
          console.error("save failed:", error.message);
          apply(saved);
          toast("保存に失敗しました");
        }
      }
    },
    [savedIds, session]
  );

  // フォロー/解除(楽観更新 → await で落庫;失敗時は巻き戻し)
  const toggleFollow = useCallback(
    async (targetUserId: string) => {
      const following = followingIds.has(targetUserId);
      const apply = (state: boolean) => {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          if (state) next.add(targetUserId);
          else next.delete(targetUserId);
          return next;
        });
      };
      apply(!following);
      if (supabase && session) {
        const { error } = following
          ? await supabase
              .from("follows")
              .delete()
              .eq("follower_id", session.user.id)
              .eq("followee_id", targetUserId)
          : await supabase
              .from("follows")
              .insert({ follower_id: session.user.id, followee_id: targetUserId });
        if (error) {
          console.error("follow failed:", error.message);
          apply(following);
          toast("フォローに失敗しました");
        }
      }
    },
    [followingIds, session]
  );

  // コメント追加後のカウンタ反映
  const bumpComments = useCallback((postId: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
    );
  }, []);

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
    savedIds,
    followingIds,
    loading,
    loadingMore,
    hasMore,
    refreshing,
    error,
    loadMore,
    refresh,
    toggleLike,
    toggleSave,
    toggleFollow,
    bumpComments,
    prependPost,
  };
}
