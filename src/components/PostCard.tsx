import { Bookmark, Heart, MapPin, MessageCircle } from "../icons";
import { toast } from "../lib/toast";
import type { Post } from "../data";

export function PostCard({
  post,
  liked,
  saved,
  following,
  isOwn,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onOpenComments,
}: {
  post: Post;
  liked: boolean;
  saved: boolean;
  following: boolean;
  isOwn: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleFollow: () => void;
  onOpenComments: () => void;
}) {
  return (
    <article class="overflow-hidden rounded-[28px] bg-white shadow-[0_12px_35px_rgba(64,42,99,0.08)]">
      <div class="flex items-center justify-between px-4 py-3.5">
        <div class="flex items-center gap-2.5">
          <img src={post.avatar} alt="" class="size-9 rounded-full object-cover" />
          <div>
            <p class="text-[13px] font-bold text-[#352d49]">{post.user}</p>
            <p class="text-[10px] text-[#9991a9]">{post.handle}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          {!isOwn && (
            <button
              onClick={onToggleFollow}
              class={
                following
                  ? "rounded-full bg-[#f1ebf7] px-3 py-1 text-[10px] font-bold text-[#6d647d]"
                  : "rounded-full bg-[#f38178] px-3 py-1 text-[10px] font-bold text-white shadow-sm shadow-[#f38178]/30"
              }
            >
              {following ? "フォロー中" : "フォロー"}
            </button>
          )}
          <button
            aria-label="投稿メニュー"
            onClick={() => toast("投稿メニューは準備中です")}
            class="text-xl leading-none text-[#b3aabf]"
          >
            •••
          </button>
        </div>
      </div>
      <div class="relative aspect-[1.1] overflow-hidden">
        <img src={post.image} alt={post.caption} class="size-full object-cover" />
        <div class="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold text-[#534966] shadow-sm backdrop-blur-sm">
          <MapPin class="mr-1 inline size-3 text-[#f47f72]" />
          {post.place}
        </div>
        <div
          class={`absolute right-4 top-4 rotate-6 rounded-2xl px-3 py-2 text-center text-[10px] font-bold shadow-lg ${
            post.tone === "coral" ? "bg-[#ffb08f] text-[#7c3e36]" : "bg-[#e4dafa] text-[#5a438e]"
          }`}
        >
          <span class="mx-auto mb-0.5 block text-base leading-none">{post.stickerEmoji}</span>
          {post.sticker}
        </div>
      </div>
      <div class="p-4">
        <div class="mb-2 flex items-center gap-4">
          <button
            onClick={onToggleLike}
            aria-label="いいね"
            class={liked ? "text-[#f47f72]" : "text-[#6d647d]"}
          >
            <Heart class={liked ? "fill-current" : ""} />
          </button>
          <button aria-label="コメント" onClick={onOpenComments} class="text-[#6d647d]">
            <MessageCircle />
          </button>
          <button
            onClick={onToggleSave}
            aria-label="保存"
            class={`ml-auto ${saved ? "text-[#6a4d92]" : "text-[#6d647d]"}`}
          >
            <Bookmark class={saved ? "fill-current" : ""} />
          </button>
        </div>
        <p class="text-[12px] font-bold text-[#3b334c]">
          {post.likes} いいね
          {post.commentsCount > 0 && (
            <button onClick={onOpenComments} class="ml-3 text-[#9a83c7]">
              {post.commentsCount} コメント
            </button>
          )}
        </p>
        <p class="mt-1 text-[13px] leading-relaxed text-[#62596f]">{post.caption}</p>
      </div>
    </article>
  );
}
