import { Search } from "../icons";
import { spots } from "../data";

export function DiscoverPage() {
  return (
    <section class="px-5 pb-28 pt-6">
      <p class="text-[11px] font-bold tracking-[0.18em] text-[#9a83c7]">EXPLORE</p>
      <h1 class="mt-1 font-display text-3xl font-bold">次の体験を探す</h1>
      <div class="mt-5 flex items-center gap-2 rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#a49bad]">
        <Search class="size-4" />
        駅名やイベント名で検索
      </div>
      <div class="mt-7 flex items-center justify-between">
        <h2 class="font-bold">近くで人気のスポット</h2>
        <span class="text-xs text-[#f47f72]">渋谷区</span>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3">
        {spots.map((spot) => (
          <div key={spot.image} class="relative aspect-square overflow-hidden rounded-2xl">
            <img src={spot.image} alt="おすすめスポット" class="size-full object-cover" />
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-3 pt-8 text-[11px] font-bold text-white">
              {spot.name}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
