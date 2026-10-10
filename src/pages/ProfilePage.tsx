import { Star, UserRound } from "../icons";
import { stickers } from "../data";

export function ProfilePage() {
  return (
    <section class="px-5 pb-28 pt-6">
      <div class="flex items-center gap-4">
        <img
          src="https://i.pravatar.cc/150?img=25"
          alt="あなたのプロフィール"
          class="size-20 rounded-full border-4 border-white object-cover shadow-md"
        />
        <div>
          <h1 class="font-display text-2xl font-bold">mio / みお</h1>
          <p class="mt-1 text-xs text-[#8d8498]">高校生活 753日目 · 東京</p>
        </div>
        <button aria-label="プロフィール設定" class="ml-auto rounded-full bg-[#f1ebf7] p-2.5">
          <UserRound class="size-4" />
        </button>
      </div>
      <div class="mt-6 rounded-[26px] bg-[#5c4a7d] p-5 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[11px] tracking-widest text-[#d9c9f4]">MY STICKER BOOK</p>
            <p class="mt-1 font-display text-3xl font-bold">
              12 <span class="text-sm font-normal text-[#d9c9f4]">/ 40 stickers</span>
            </p>
          </div>
          <Star class="fill-[#ffc67b] text-[#ffc67b]" />
        </div>
        <div class="mt-4 h-2 rounded-full bg-white/20">
          <div class="h-full w-[30%] rounded-full bg-[#ffc67b]" />
        </div>
      </div>
      <div class="mt-7 flex items-center justify-between">
        <h2 class="font-display text-xl font-bold">思い出の図鑑</h2>
        <button class="text-xs font-bold text-[#9a83c7]">一覧を見る</button>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-3">
        {stickers.map((sticker) => (
          <div
            key={sticker.label}
            class={`${sticker.color} flex aspect-square flex-col items-center justify-center rounded-2xl text-center shadow-sm`}
          >
            <span class="text-3xl">{sticker.emoji}</span>
            <span class="mt-2 text-[11px] font-bold text-[#51465d]">{sticker.label}</span>
            <span class="text-[9px] text-[#776b7f]">{sticker.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
