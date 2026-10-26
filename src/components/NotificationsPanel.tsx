import { Heart, MessageCircle, UserRound } from "../icons";
import type { NotificationItem } from "../hooks/useNotifications";
import { relativeTime } from "../lib/time";

function label(n: NotificationItem): string {
  if (n.type === "follow") return `${n.actorName} さんがあなたをフォローしました`;
  if (n.type === "like") return `${n.actorName} さんがあなたの投稿にいいねしました`;
  if (n.type === "comment") return `${n.actorName} さんがあなたの投稿にコメントしました`;
  return n.actorName;
}

function icon(type: string) {
  if (type === "follow") return <UserRound class="size-4 text-[#9a83c7]" />;
  if (type === "like") return <Heart class="size-4 text-[#f47f72]" />;
  return <MessageCircle class="size-4 text-[#6a4d92]" />;
}

export function NotificationsPanel({
  items,
  loading,
  onClose,
}: {
  items: NotificationItem[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-[#342c45]/40 backdrop-blur-sm" onClick={onClose} />
      <div class="relative flex max-h-[80vh] w-full max-w-[380px] flex-col rounded-[28px] bg-[#fffaf7] p-5 shadow-2xl">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">通知</h2>
          <button onClick={onClose} class="text-[11px] font-bold text-[#9a83c7]">
            閉じる
          </button>
        </div>
        <div class="mt-3 flex-1 space-y-2 overflow-y-auto">
          {loading ? (
            <p class="py-10 text-center text-[12px] font-bold text-[#a49bad]">読み込み中...</p>
          ) : items.length === 0 ? (
            <p class="py-10 text-center text-[12px] font-bold text-[#a49bad]">
              通知はまだありません
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                class={`flex items-start gap-3 rounded-2xl px-3 py-3 ${
                  n.read ? "bg-white" : "bg-[#f3edf8]"
                }`}
              >
                <span class="mt-0.5">{icon(n.type)}</span>
                <div class="flex-1">
                  <p class="text-[12px] font-bold text-[#4a4157]">{label(n)}</p>
                  <p class="mt-0.5 text-[10px] text-[#a49bad]">{relativeTime(n.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
