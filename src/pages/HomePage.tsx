import { useEffect, useRef, useState } from "preact/hooks";
import { ChevronRight, RefreshCw } from "../icons";
import type { Post } from "../data";
import { PostCard } from "../components/PostCard";

export function HomePage({
  posts,
  onExplore,
  likedIds,
  savedIds,
  followingIds,
  currentUserId,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onOpenComments,
  loading,
  loadingMore,
  hasMore,
  refreshing,
  error,
  onRefresh,
  onLoadMore,
}: {
  posts: Post[];
  onExplore: () => void;
  likedIds: Set<number>;
  savedIds: Set<number>;
  followingIds: Set<string>;
  currentUserId: string | null;
  onToggleLike: (postId: number) => void;
  onToggleSave: (postId: number) => void;
  onToggleFollow: (userId: string) => void;
  onOpenComments: (post: Post) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;
}) {
  // 下拉刷新(触摸)
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  // 无限滚动哨兵
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadingMore, hasMore, onLoadMore]);

  function onTouchStart(e: TouchEvent) {
    if (window.scrollY === 0 && !refreshing) startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: TouchEvent) {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY === 0) setPull(Math.min(dy * 0.5, 90));
  }
  function onTouchEnd() {
    if (pull > 60) onRefresh();
    setPull(0);
    startY.current = null;
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* 下拉刷新指示器 */}
      <div
        class="flex items-center justify-center overflow-hidden text-[11px] font-bold text-[#9a83c7]"
        style={{ height: `${refreshing ? 44 : pull}px` }}
      >
        {refreshing ? "更新中..." : pull > 60 ? "指を離して更新" : ""}
      </div>
      <section class="px-5 pb-5 pt-5">
        <div class="relative overflow-hidden rounded-[26px] bg-[#e8e0f7] p-5">
          <div class="relative z-10 max-w-[230px]">
            <p class="mb-1 text-[11px] font-bold tracking-[0.18em] text-[#8b70bb]">
              TODAY'S MEMORY
            </p>
            <h1 class="font-display text-[27px] font-bold leading-tight text-[#49366c]">
              今日の思い出を
              <br />
              1つ増やそう。
            </h1>
            <button
              onClick={onExplore}
              class="mt-4 rounded-full bg-[#5e4a83] px-4 py-2 text-[11px] font-bold text-white shadow-lg shadow-[#5e4a83]/20"
            >
              体験を探す <ChevronRight class="ml-1 inline size-3" />
            </button>
          </div>
          <div class="absolute -right-4 -top-4 text-[110px] leading-none opacity-30">✦</div>
          <div class="absolute -bottom-5 right-6 rotate-12 rounded-2xl bg-[#ffc3a7] px-3 py-4 text-center text-[11px] font-bold text-[#884d40] shadow-xl">
            あと
            <br />
            <span class="font-display text-2xl">247</span>日
          </div>
        </div>
      </section>
      {error && (
        <div class="mx-5 mb-3 rounded-2xl bg-[#ffe9df] px-4 py-3 text-[12px] font-bold text-[#b4533c]">
          <p>フィードを読み込めませんでした:{error}</p>
          <button onClick={onRefresh} class="mt-1 text-[11px] underline">
            再試行
          </button>
        </div>
      )}
      <div class="flex items-center justify-between px-5 pb-3">
        <h2 class="font-display text-lg font-bold">みんなの体験</h2>
        <div class="flex items-center gap-3">
          <button
            aria-label="更新"
            onClick={onRefresh}
            class={refreshing ? "animate-spin text-[#9a83c7]" : "text-[#9a83c7]"}
          >
            <RefreshCw size={15} />
          </button>
          <button onClick={onExplore} class="text-[11px] font-bold text-[#9a83c7]">
            すべて見る <ChevronRight class="inline size-3" />
          </button>
        </div>
      </div>
      <section class="flex flex-col gap-5 px-5 pb-28">
        {loading && posts.length === 0 ? (
          <p class="py-16 text-center text-[12px] font-bold text-[#a49bad]">読み込み中...</p>
        ) : posts.length === 0 ? (
          <p class="py-16 text-center text-[12px] font-bold text-[#a49bad]">
            まだ投稿がありません。最初の思い出を投稿しよう!
          </p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likedIds.has(post.id)}
              saved={savedIds.has(post.id)}
              following={followingIds.has(post.userId)}
              isOwn={currentUserId !== null && currentUserId === post.userId}
              onToggleLike={() => onToggleLike(post.id)}
              onToggleSave={() => onToggleSave(post.id)}
              onToggleFollow={() => onToggleFollow(post.userId)}
              onOpenComments={() => onOpenComments(post)}
            />
          ))
        )}
        {loadingMore && (
          <p class="py-3 text-center text-[11px] font-bold text-[#a49bad]">読み込み中...</p>
        )}
        {!loading && posts.length > 0 && !hasMore && !loadingMore && (
          <p class="py-3 text-center text-[11px] font-bold text-[#c9c2d2]">全部見たよ ✨</p>
        )}
        {hasMore && !loadingMore && typeof IntersectionObserver !== "undefined" && (
          <div ref={sentinelRef} class="h-1" />
        )}
        {hasMore && !loadingMore && typeof IntersectionObserver === "undefined" && (
          <button
            onClick={onLoadMore}
            class="mx-auto rounded-full bg-[#f1ebf7] px-6 py-2 text-[12px] font-bold text-[#6a4d92]"
          >
            もっと見る
          </button>
        )}
      </section>
    </div>
  );
}
