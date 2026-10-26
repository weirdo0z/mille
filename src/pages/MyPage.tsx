import { Bell, ChevronRight, Flame, LogOut, Star, UserRound } from "../icons";
import { toast } from "../lib/toast";
import { composeImages, stickers as demoStickers, type StickerView } from "../data";
import { schoolDayCount, type DbProfile } from "../lib/db";

const demoMyPosts: {
  image: string;
  caption: string;
  stickerName?: string;
  stickerEmoji?: string;
}[] = [
  { image: composeImages[0], caption: "放課後の定番スポット" },
  { image: composeImages[2], caption: "今日の空、きれいだった" },
  { image: composeImages[3], caption: "部活終わりに寄り道" },
  { image: composeImages[5], caption: "ライブ、楽しかった!" },
];

export function MyPage({
  profile,
  onLogout,
  postCount,
  myPosts,
  onOpenEdit,
  followersCount,
  followingCount,
  stickerViews,
  collectedCount,
  totalCount,
}: {
  profile: DbProfile | null;
  onLogout: () => void;
  postCount: number | null;
  myPosts: { image: string; caption: string; stickerName?: string; stickerEmoji?: string }[] | null;
  onOpenEdit: () => void;
  followersCount: number | null;
  followingCount: number | null;
  stickerViews: StickerView[] | null;
  collectedCount: number | null;
  totalCount: number | null;
}) {
  const displayName = profile?.display_name || profile?.username || "mio / みお";
  const handle = profile ? `@${profile.username}` : "@mio_days";
  const avatar = profile?.avatar_url || "https://i.pravatar.cc/150?img=25";
  const day = schoolDayCount(profile?.school_started_at);
  const meta = profile
    ? [day ? `高校生活 ${day}日目` : null, profile.prefecture || "東京"].filter(Boolean).join(" · ")
    : "高校生活 753日目 · 東京";
  const posts = postCount ?? 24;
  // 実数が取れていない場合は「—」、demo モードは旧展示のまま
  const followers = followersCount ?? (postCount !== null ? "—" : "318");
  const following = followingCount ?? (postCount !== null ? "—" : "96");
  const grid = myPosts ?? demoMyPosts;
  // 図鑑:demo モードは全収集済み + 旧版 12/40 展示
  const list: StickerView[] = stickerViews ?? demoStickers.map((s) => ({ ...s, collected: true }));
  const collected = collectedCount ?? 12;
  const total = totalCount ?? 40;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <section class="px-5 pb-28 pt-6">
      <div class="flex items-center gap-4">
        <img
          src={avatar}
          alt="あなたのプロフィール"
          class="size-20 rounded-full border-4 border-white object-cover shadow-md"
        />
        <div>
          <h1 class="font-display text-2xl font-bold">{displayName}</h1>
          <p class="mt-1 text-xs text-[#8d8498]">{handle} · {meta}</p>
        </div>
        <button
          aria-label="プロフィール設定"
          onClick={onOpenEdit}
          class="ml-auto rounded-full bg-[#f1ebf7] p-2.5"
        >
          <UserRound class="size-4" />
        </button>
      </div>
      <div class="mt-6 flex justify-around rounded-[24px] bg-[#f3edf8] py-4 text-center">
        <div>
          <p class="font-display text-lg font-bold">{posts}</p>
          <p class="text-[10px] font-bold text-[#8d8498]">投稿</p>
        </div>
        <div>
          <p class="font-display text-lg font-bold">{followers}</p>
          <p class="text-[10px] font-bold text-[#8d8498]">フォロワー</p>
        </div>
        <div>
          <p class="font-display text-lg font-bold">{following}</p>
          <p class="text-[10px] font-bold text-[#8d8498]">フォロー中</p>
        </div>
      </div>
      <div class="mt-6 rounded-[26px] bg-[#5c4a7d] p-5 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[11px] tracking-widest text-[#d9c9f4]">MY STICKER BOOK</p>
            <p class="mt-1 font-display text-3xl font-bold">
              {collected} <span class="text-sm font-normal text-[#d9c9f4]">/ {total} stickers</span>
            </p>
          </div>
          <Star class="fill-[#ffc67b] text-[#ffc67b]" />
        </div>
        <div class="mt-4 h-2 rounded-full bg-white/20">
          <div class="h-full rounded-full bg-[#ffc67b]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div class="mt-7">
        <h2 class="font-display text-xl font-bold">思い出の図鑑</h2>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-3">
        {list.map((sticker) => (
          <div
            key={sticker.label}
            class="flex aspect-square flex-col items-center justify-center rounded-2xl text-center shadow-sm"
            style={{ backgroundColor: sticker.collected ? sticker.color : "#ece7f2" }}
          >
            <span class={`text-3xl ${sticker.collected ? "" : "opacity-30 grayscale"}`}>
              {sticker.emoji}
            </span>
            <span class="mt-2 text-[11px] font-bold text-[#51465d]">{sticker.label}</span>
            <span class="text-[9px] text-[#776b7f]">{sticker.collected ? sticker.sub : "未獲得"}</span>
          </div>
        ))}
      </div>
      <div class="mt-6 rounded-[26px] bg-[#ffe9df] p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold tracking-widest text-[#d4836a]">STREAK</p>
            <p class="mt-1 font-display text-3xl font-bold text-[#8a4d3b]">
              47 <span class="text-sm font-normal text-[#c98d79]">/ 100 days</span>
            </p>
          </div>
          <Flame class="size-8 text-[#f38178]" />
        </div>
        <div class="mt-4 h-2 rounded-full bg-white/60">
          <div class="h-full w-[47%] rounded-full bg-[#f38178]" />
        </div>
      </div>
      <div class="mt-7">
        <h2 class="font-display text-xl font-bold">わたしの投稿</h2>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3">
        {grid.length === 0 ? (
          <p class="col-span-2 py-10 text-center text-[12px] font-bold text-[#a49bad]">
            まだ投稿がありません
          </p>
        ) : (
          grid.map((p) => (
            <div key={p.image} class="relative aspect-square overflow-hidden rounded-2xl">
              <img src={p.image} alt={p.caption} class="size-full object-cover" />
              {p.stickerName && (
                <div class="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-bold text-white">
                  {p.stickerEmoji} {p.stickerName}
                </div>
              )}
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-3 pt-8 text-[11px] font-bold text-white">
                {p.caption}
              </div>
            </div>
          ))
        )}
      </div>
      <div class="mt-7">
        <h2 class="font-display text-xl font-bold">設定</h2>
      </div>
      <div class="mt-2 rounded-[24px] bg-white shadow-sm">
        <button
          onClick={onOpenEdit}
          class="flex w-full items-center gap-3 border-b border-[#f0e7ef] px-4 py-3.5 text-[13px] font-bold text-[#4a4157]"
        >
          <UserRound class="size-4 text-[#9a83c7]" />
          プロフィールを編集
          <ChevronRight class="ml-auto size-4 text-[#b3aabf]" />
        </button>
        <button
          onClick={() => toast("通知設定は準備中です")}
          class="flex w-full items-center gap-3 border-b border-[#f0e7ef] px-4 py-3.5 text-[13px] font-bold text-[#4a4157]"
        >
          <Bell class="size-4 text-[#9a83c7]" />
          通知設定
          <ChevronRight class="ml-auto size-4 text-[#b3aabf]" />
        </button>
        <button
          onClick={onLogout}
          class="flex w-full items-center gap-3 px-4 py-3.5 text-[13px] font-bold text-[#f47f72]"
        >
          <LogOut class="size-4" />
          ログアウト
        </button>
      </div>
    </section>
  );
}
