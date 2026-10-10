import { ChevronRight } from "../icons";
import { stories, type Post } from "../data";
import { PostCard } from "../components/PostCard";
import { Story } from "../components/StoryRow";

export function HomePage({
  posts,
  onExplore,
  likedIds,
  onToggleLike,
}: {
  posts: Post[];
  onExplore: () => void;
  likedIds: Set<number>;
  onToggleLike: (postId: number) => void;
}) {
  return (
    <>
      <section class="flex gap-4 overflow-x-auto px-5 py-5 [scrollbar-width:none]">
        {stories.map((story) => (
          <Story key={story.name} {...story} />
        ))}
      </section>
      <section class="px-5 pb-5">
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
      <div class="flex items-center justify-between px-5 pb-3">
        <h2 class="font-display text-lg font-bold">みんなの体験</h2>
        <button class="text-[11px] font-bold text-[#9a83c7]">
          すべて見る <ChevronRight class="inline size-3" />
        </button>
      </div>
      <section class="flex flex-col gap-5 px-5 pb-28">
        {posts.length === 0 ? (
          <p class="py-16 text-center text-[12px] font-bold text-[#a49bad]">
            まだ投稿がありません。最初の思い出を投稿しよう!
          </p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likedIds.has(post.id)}
              onToggleLike={() => onToggleLike(post.id)}
            />
          ))
        )}
      </section>
    </>
  );
}
