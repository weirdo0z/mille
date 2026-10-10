import { Camera, Compass, Flame, Star, UserRound } from "../icons";

export type Page = "home" | "discover" | "profile" | "mypage";

function Tab({
  page,
  active,
  onChange,
  icon: NavIcon,
  label,
}: {
  page: Page;
  active: Page;
  onChange: (page: Page) => void;
  icon: typeof Flame;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(page)}
      class={`flex flex-col items-center gap-1 text-[10px] font-bold ${
        active === page ? "text-[#6a4d92]" : "text-[#b2a9b9]"
      }`}
    >
      <NavIcon class="size-5" />
      {label}
    </button>
  );
}

export function BottomNav({
  active,
  onChange,
  onCompose,
}: {
  active: Page;
  onChange: (page: Page) => void;
  onCompose: () => void;
}) {
  return (
    <nav class="fixed bottom-0 z-30 flex w-full max-w-[430px] items-center justify-around border-t border-[#eee5f0] bg-[#fffaf7]/95 px-5 py-3.5 backdrop-blur-md">
      <Tab page="home" active={active} onChange={onChange} icon={Flame} label="フィード" />
      <Tab page="discover" active={active} onChange={onChange} icon={Compass} label="さがす" />
      <button
        aria-label="投稿する"
        onClick={onCompose}
        class="-mt-8 flex size-14 items-center justify-center rounded-full bg-[#f38178] text-white shadow-lg shadow-[#f38178]/30"
      >
        <Camera />
      </button>
      <Tab page="profile" active={active} onChange={onChange} icon={Star} label="図鑑" />
      <Tab page="mypage" active={active} onChange={onChange} icon={UserRound} label="マイページ" />
    </nav>
  );
}
