import { Bell, Search } from "../icons";
import { Logo } from "./Logo";

export function Header({ onSearch }: { onSearch: () => void }) {
  return (
    <header class="sticky top-0 z-20 flex items-center justify-between border-b border-[#f0e7ef] bg-[#fffaf7]/95 px-5 py-4 backdrop-blur-md">
      <Logo />
      <div class="flex items-center gap-4 text-[#655b75]">
        <button aria-label="検索" onClick={onSearch}>
          <Search />
        </button>
        <button aria-label="通知" class="relative">
          <Bell />
          <span class="absolute -right-1 -top-1 size-2 rounded-full bg-[#f47f72]" />
        </button>
      </div>
    </header>
  );
}
