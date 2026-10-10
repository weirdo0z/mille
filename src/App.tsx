import { useEffect, useState } from "preact/hooks";
import type { Session } from "@supabase/supabase-js";
import { BottomNav, type Page } from "./components/BottomNav";
import { ComposeModal } from "./components/ComposeModal";
import { Header } from "./components/Header";
import { composeImages, posts as mockPosts, type Post } from "./data";
import { mapPost, type DbProfile, type PostRow } from "./lib/db";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { AuthPage } from "./pages/AuthPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { HomePage } from "./pages/HomePage";
import { MyPage } from "./pages/MyPage";
import { ProfilePage } from "./pages/ProfilePage";

const FEED_SELECT =
  "id, user_id, image_url, caption, place_name, sticker_name, tone, likes_count, profiles(username, display_name, avatar_url)";

function App() {
  const [active, setActive] = useState<Page>("home");
  const [feed, setFeed] = useState<Post[]>(supabaseConfigured ? [] : mockPosts);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);

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

  // 登录后加载:自己的 profile + feed + 已点赞集合
  useEffect(() => {
    if (!supabase || !session) return;
    let alive = true;
    (async () => {
      const [p, posts, likes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", session.user.id)
          .single(),
        supabase.from("posts").select(FEED_SELECT).order("created_at", { ascending: false }),
        supabase.from("likes").select("post_id").eq("user_id", session.user.id),
      ]);
      if (!alive) return;
      if (p.data) setProfile(p.data as DbProfile);
      if (posts.data) setFeed((posts.data as PostRow[]).map(mapPost));
      if (likes.data)
        setLikedIds(new Set((likes.data as { post_id: number }[]).map((r) => r.post_id)));
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  function toggleLike(postId: number) {
    const liked = likedIds.has(postId);
    // 乐观更新
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setFeed((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likes: String(Math.max(0, Number(p.likes) + (liked ? -1 : 1))) } : p
      )
    );
    // 落库:likes 行 + likes_count 由 toggle_like RPC 原子维护
    if (supabase && session) {
      supabase.rpc("toggle_like", { p_post_id: postId });
    }
  }

  async function addPost(caption: string, sticker: string, tone: Post["tone"]) {
    if (supabase && session) {
      const image = composeImages[Math.floor(Math.random() * composeImages.length)];
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: session.user.id,
          image_url: image,
          caption,
          sticker_name: sticker,
          place_name: "東京",
          tone,
        })
        .select(FEED_SELECT)
        .single();
      if (data) setFeed((prev) => [mapPost(data as PostRow), ...prev]);
      if (error) console.error("addPost failed:", error.message);
    } else {
      // demo 模式:仅本地追加
      const post: Post = {
        id: Date.now(),
        user: "mio",
        handle: "@mio_days",
        avatar: "https://i.pravatar.cc/150?img=25",
        image: composeImages[Math.floor(Math.random() * composeImages.length)],
        caption,
        place: "東京",
        sticker,
        likes: "0",
        tone,
      };
      setFeed((prev) => [post, ...prev]);
    }
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setFeed([]);
    setLikedIds(new Set());
    setProfile(null);
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
        <Header onSearch={() => setActive("discover")} />
        {active === "home" && (
          <HomePage
            posts={feed}
            onExplore={() => setActive("discover")}
            likedIds={likedIds}
            onToggleLike={toggleLike}
          />
        )}
        {active === "discover" && <DiscoverPage />}
        {active === "profile" && <ProfilePage />}
        {active === "mypage" && (
          <MyPage
            onOpenCollection={() => setActive("profile")}
            profile={profile}
            onLogout={logout}
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
        />
      </div>
    </main>
  );
}

export default App;
