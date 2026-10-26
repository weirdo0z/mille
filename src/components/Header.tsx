import { Bell, Search } from "../icons";
import { Logo } from "./Logo";

export function Header({
  onSearch,
  onBell,
  unread,
}: {
  onSearch: () => void;
  onBell: () => void;
  unread: number;
}) {
  return (
    <header class="sticky top-0 z-20 flex items-center justify-between border-b border-[#f0e7ef] bg-[#fffaf7]/95 px-5 py-4 backdrop-blur-md">
      <Logo />
      <div class="flex items-center gap-4 text-[#655b75]">
        <button aria-label="検索" onClick={onSearch}>
          <Search />
        </button>
        <button aria-label="通知" class="relative" onClick={onBell}>
          <Bell />
          {unread > 0 && (
            <span class="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f47f72] px-1 text-[9px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
