import { useEffect, useState } from "preact/hooks";
import type { Session } from "@supabase/supabase-js";
import { BottomNav, type Page } from "./components/BottomNav";
import { CommentModal } from "./components/CommentModal";
import { ComposeModal, type ComposeData } from "./components/ComposeModal";
import { Header } from "./components/Header";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { Toaster } from "./components/Toaster";
import { ProfileEditModal, type ProfileEditData } from "./components/ProfileEditModal";
import { stickers as demoStickers, type Post, type StickerView } from "./data";
import { useFeed } from "./hooks/useFeed";
import { useNotifications } from "./hooks/useNotifications";
import { type DbProfile, type StickerRow } from "./lib/db";
import { compressImage } from "./lib/image";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { AuthPage } from "./pages/AuthPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { HomePage } from "./pages/HomePage";
import { MyPage } from "./pages/MyPage";

interface MyPost {
  image: string;
  caption: string;
  stickerName?: string;
  stickerEmoji?: string;
}

function App() {
  const [active, setActive] = useState<Page>("home");
  const [composeOpen, setComposeOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [editOpen, setEditOpen] = useState(false);
  // 图鉴 + 我的页面数据(真实模式加载;null = demo 回退)
  const [stickerViews, setStickerViews] = useState<StickerView[] | null>(null);
  const [collection, setCollection] = useState<{ collected: number; total: number } | null>(null);
  const [myPosts, setMyPosts] = useState<MyPost[] | null>(null);
  const [myPostCount, setMyPostCount] = useState<number | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const feed = useFeed(session);
  const notif = useNotifications(session);

  // 确保 profiles 行存在(触发器缺失/老账号时补建);返回最终 profile
  async function ensureProfile(s: Session): Promise<DbProfile | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, prefecture, school_started_at")
      .eq("id", s.user.id)
      .single();
    if (data) return data as DbProfile;
    const meta = (s.user.user_metadata ?? {}) as Record<string, string>;
    const username = meta.username || `user_${s.user.id.slice(0, 8)}`;
    const { data: healed, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: s.user.id,
          username,
          display_name: meta.display_name || "",
          prefecture: meta.prefecture || "東京",
          school_started_at: meta.school_started_at || null,
        },
        { onConflict: "id" }
      )
      .select("id, username, display_name, avatar_url, prefecture, school_started_at")
      .single();
    if (healed) return healed as DbProfile;
    console.error("ensureProfile failed:", error?.message);
    return null;
  }

  // 认证初始化:恢复 session + 订阅状态变化
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // 登录后加载:profile(缺失则补建)+ 贴纸图鉴 + 我的帖子
  useEffect(() => {
    if (!supabase || !session) return;
    let alive = true;
    (async () => {
      const [prof, stickerRows, collected, myRows, myCount, followersQ, followingQ] =
        await Promise.all([
          ensureProfile(session),
          supabase
            .from("stickers")
            .select("id, name, emoji, label, sub, color")
            .eq("active", true)
            .order("id"),
          supabase.from("user_stickers").select("sticker_id").eq("user_id", session.user.id),
          supabase
            .from("posts")
            .select("image_url, caption, sticker_name, sticker_emoji")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id),
          supabase
            .from("follows")
            .select("follower_id", { count: "exact", head: true })
            .eq("followee_id", session.user.id),
          supabase
            .from("follows")
            .select("followee_id", { count: "exact", head: true })
            .eq("follower_id", session.user.id),
        ]);
      if (!alive) return;
      if (prof) setProfile(prof);
      if (stickerRows.data) {
        const rows = stickerRows.data as StickerRow[];
        const owned = new Set(
          (collected.data ?? []).map((r: { sticker_id: number }) => r.sticker_id)
        );
        setStickerViews(
          rows.map((r) => ({
            emoji: r.emoji,
            label: r.label,
            sub: r.sub,
            color: r.color,
            collected: owned.has(r.id),
          }))
        );
        setCollection({ collected: owned.size, total: rows.length });
      }
      if (myRows.data)
        setMyPosts(
          (
            myRows.data as {
              image_url: string;
              caption: string | null;
              sticker_name: string | null;
              sticker_emoji: string | null;
            }[]
          ).map((r) => ({
            image: r.image_url,
            caption: r.caption ?? "",
            stickerName: r.sticker_name ?? "",
            stickerEmoji: r.sticker_emoji ?? "",
          }))
        );
      if (myCount.count !== null) setMyPostCount(myCount.count);
      if (followersQ.count !== null) setFollowersCount(followersQ.count);
      if (followingQ.count !== null) setFollowingCount(followingQ.count);
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  async function saveProfile(data: ProfileEditData): Promise<string | null> {
    if (supabase && session) {
      let avatarUrl = profile?.avatar_url ?? null;
      if (data.avatar) {
        const ext = data.avatar.name.split(".").pop() || "jpg";
        const { data: up, error: upErr } = await supabase.storage
          .from("avatars")
          .upload(`${session.user.id}/avatar.${ext}`, data.avatar, { upsert: true });
        if (upErr) return `画像アップロードに失敗: ${upErr.message}`;
        // 同名覆盖时加时间戳参数避免浏览器缓存旧图
        avatarUrl = `${supabase.storage.from("avatars").getPublicUrl(up.path).data.publicUrl}?t=${Date.now()}`;
      }
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: session.user.id,
            display_name: data.displayName,
            username: data.username,
            prefecture: data.prefecture,
            school_started_at: data.schoolStartedAt,
            avatar_url: avatarUrl,
          },
          { onConflict: "id" }
        );
      if (error) return error.message;
      setProfile((prev) => ({
        ...(prev ?? {
          id: session.user.id,
          username: data.username,
          display_name: data.displayName,
          avatar_url: avatarUrl,
        }),
        username: data.username,
        display_name: data.displayName,
        prefecture: data.prefecture,
        school_started_at: data.schoolStartedAt,
        avatar_url: avatarUrl,
      }));
      return null;
    }
    // demo 模式:仅本地更新
    setProfile({
      id: "demo",
      username: data.username,
      display_name: data.displayName,
      avatar_url: data.avatar ? URL.createObjectURL(data.avatar) : (profile?.avatar_url ?? null),
      prefecture: data.prefecture,
      school_started_at: data.schoolStartedAt,
    });
    return null;
  }

  async function addPost(data: ComposeData): Promise<string | null> {
    if (supabase && session) {
      // 1) 确保 profile 行存在(posts.user_id 外键要求)
      const prof = await ensureProfile(session);
      if (prof) setProfile(prof);
      if (!prof) return "プロフィールの作成に失敗しました。再ログインしてみてください";
      // 2) 画像圧縮(長辺 1600px / JPEG q0.85;小さい・GIF はそのまま)
      const blob = await compressImage(data.image);
      const ext =
        blob === data.image ? (data.image.name.split(".").pop() || "jpg") : "jpg";
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage
        .from("post-images")
        .upload(path, blob);
      if (upErr) return `画像アップロードに失敗: ${upErr.message}`;
      const imageUrl = supabase.storage.from("post-images").getPublicUrl(up.path).data.publicUrl;
      // 3) 插入(不带 embed,规避关系解析/schema cache 问题)
      const payload: Record<string, unknown> = {
        user_id: session.user.id,
        image_url: imageUrl,
        caption: data.caption,
        sticker_name: data.stickerName,
        sticker_emoji: data.stickerEmoji,
        place_name: prof.prefecture || "東京",
        tone: data.tone,
      };
      let { data: row, error } = await supabase
        .from("posts")
        .insert(payload)
        .select("id")
        .single();
      if (error && /sticker_emoji/i.test(error.message)) {
        // 旧库缺 sticker_emoji 列时自动降级重试
        delete payload.sticker_emoji;
        ({ data: row, error } = await supabase
          .from("posts")
          .insert(payload)
          .select("id")
          .single());
      }
      if (error) return `投稿に失敗: ${error.message}`;
      if (!row) return "投稿に失敗しました(応答なし)";
      // 4) 本地拼装并上墙(profile 已知,无需回查)
      feed.prependPost({
        id: row.id,
        userId: session.user.id,
        user: prof.display_name || prof.username,
        handle: `@${prof.username}`,
        avatar: prof.avatar_url || "https://i.pravatar.cc/100?img=5",
        image: imageUrl,
        caption: data.caption,
        place: prof.prefecture || "東京",
        sticker: data.stickerName,
        stickerEmoji: data.stickerEmoji,
        likes: "0",
        commentsCount: 0,
        tone: data.tone,
      });
      setMyPostCount((prev) => (prev ?? 0) + 1);
      // わたしの投稿グリッドも即時反映(最新 4 件)
      setMyPosts((prev) =>
        prev
          ? [
              {
                image: imageUrl,
                caption: data.caption,
                stickerName: data.stickerName,
                stickerEmoji: data.stickerEmoji,
              },
              ...prev,
            ].slice(0, 4)
          : prev
      );
      return null;
    }
    // demo 模式:仅本地追加
    feed.prependPost({
      id: Date.now(),
      userId: "demo",
      user: profile?.display_name || profile?.username || "mio",
      handle: profile ? `@${profile.username}` : "@mio_days",
      avatar: profile?.avatar_url || "https://i.pravatar.cc/150?img=25",
      image: URL.createObjectURL(data.image),
      caption: data.caption,
      place: profile?.prefecture || "東京",
      sticker: data.stickerName,
      stickerEmoji: data.stickerEmoji,
      likes: "0",
      commentsCount: 0,
      tone: data.tone,
    });
    return null;
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setProfile(null);
    setStickerViews(null);
    setCollection(null);
    setMyPosts(null);
    setMyPostCount(null);
  }

  if (!authReady) {
    return (
      <div class="flex min-h-screen items-center justify-center bg-[#f5f0f9]">
        <p class="font-display text-lg text-[#8b70bb]">読み込み中...</p>
      </div>
    );
  }

  if (supabaseConfigured && !session) {
    return <AuthPage />;
  }

  return (
    <main class="min-h-screen bg-[#f5f0f9] text-[#342c45]">
      <div class="mx-auto min-h-screen max-w-[430px] bg-[#fffaf7] shadow-2xl shadow-[#5f4c78]/10">
        <Header
          onSearch={() => setActive("discover")}
          onBell={() => {
            setNotifOpen(true);
            notif.markAllRead();
          }}
          unread={notif.unread}
        />
        {active === "home" && (
          <HomePage
            posts={feed.posts}
            onExplore={() => setActive("discover")}
            likedIds={feed.likedIds}
            savedIds={feed.savedIds}
            followingIds={feed.followingIds}
            currentUserId={session?.user.id ?? null}
            onToggleLike={feed.toggleLike}
            onToggleSave={feed.toggleSave}
            onToggleFollow={feed.toggleFollow}
            onOpenComments={(post) => setCommentPost(post)}
            loading={feed.loading}
            loadingMore={feed.loadingMore}
            hasMore={feed.hasMore}
            refreshing={feed.refreshing}
            error={feed.error}
            onRefresh={feed.refresh}
            onLoadMore={feed.loadMore}
          />
        )}
        {active === "discover" && <DiscoverPage />}
        {active === "mypage" && (
          <MyPage
            profile={profile}
            onLogout={logout}
            postCount={myPostCount}
            myPosts={myPosts}
            onOpenEdit={() => setEditOpen(true)}
            followersCount={followersCount}
            followingCount={followingCount}
            stickerViews={stickerViews}
            collectedCount={collection?.collected ?? null}
            totalCount={collection?.total ?? null}
          />
        )}
        <BottomNav
          active={active}
          onChange={setActive}
          onCompose={() => setComposeOpen(true)}
        />
        <ComposeModal
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          onSubmit={addPost}
          stickers={stickerViews ?? demoStickers.map((s) => ({ ...s, collected: true }))}
        />
        {editOpen && (
          <ProfileEditModal
            profile={profile}
            onClose={() => setEditOpen(false)}
            onSave={saveProfile}
          />
        )}
        {commentPost && (
          <CommentModal
            post={commentPost}
            currentUser={profile}
            onClose={() => setCommentPost(null)}
            onAdded={() => feed.bumpComments(commentPost.id)}
          />
        )}
        {notifOpen && (
          <NotificationsPanel
            items={notif.items}
            loading={notif.loading}
            onClose={() => setNotifOpen(false)}
          />
        )}
        <Toaster />
      </div>
    </main>
  );
}

export default App;
