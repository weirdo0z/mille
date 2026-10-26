import { Star, UserRound } from "../icons";
import { toast } from "../lib/toast";
import { stickers as demoStickers, type StickerView } from "../data";
import { schoolDayCount, type DbProfile } from "../lib/db";

export function ProfilePage({
  profile,
  stickers,
  collectedCount,
  totalCount,
  onOpenEdit,
}: {
  profile: DbProfile | null;
  stickers: StickerView[] | null;
  collectedCount: number | null;
  totalCount: number | null;
  onOpenEdit: () => void;
}) {
  // demo 模式回退:全部已收集 + 旧版 12/40 展示
  const list: StickerView[] =
    stickers ?? demoStickers.map((s) => ({ ...s, collected: true }));
  const collected = collectedCount ?? 12;
  const total = totalCount ?? 40;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
  const displayName = profile?.display_name || profile?.username || "mio / みお";
  const day = schoolDayCount(profile?.school_started_at);
  const meta = profile
    ? [day ? `高校生活 ${day}日目` : null, profile.prefecture || "東京"].filter(Boolean).join(" · ")
    : "高校生活 753日目 · 東京";

  return (
    <section class="px-5 pb-28 pt-6">
      <div class="flex items-center gap-4">
        <img
          src={profile?.avatar_url || "https://i.pravatar.cc/150?img=25"}
          alt="あなたのプロフィール"
          class="size-20 rounded-full border-4 border-white object-cover shadow-md"
        />
        <div>
          <h1 class="font-display text-2xl font-bold">{displayName}</h1>
          <p class="mt-1 text-xs text-[#8d8498]">{meta}</p>
        </div>
        <button
          aria-label="プロフィール設定"
          onClick={onOpenEdit}
          class="ml-auto rounded-full bg-[#f1ebf7] p-2.5"
        >
          <UserRound class="size-4" />
        </button>
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
      <div class="mt-7 flex items-center justify-between">
        <h2 class="font-display text-xl font-bold">思い出の図鑑</h2>
        <button
          onClick={() => toast("ステッカー一覧は準備中です")}
          class="text-xs font-bold text-[#9a83c7]"
        >
          一覧を見る
        </button>
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
    </section>
  );
}
