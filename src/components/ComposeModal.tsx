import { useState } from "preact/hooks";
import type { Post } from "../data";

export function ComposeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (caption: string, sticker: string, tone: Post["tone"]) => void;
}) {
  const [caption, setCaption] = useState("");
  const [sticker, setSticker] = useState("");
  const [tone, setTone] = useState<Post["tone"]>("lavender");

  if (!open) return null;

  function submit() {
    if (!caption.trim()) return;
    onSubmit(caption.trim(), sticker.trim() || "はじめての投稿", tone);
    setCaption("");
    setSticker("");
    setTone("lavender");
    onClose();
  }

  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-[#342c45]/40 backdrop-blur-sm" onClick={onClose} />
      <div class="relative w-full max-w-[380px] rounded-[28px] bg-[#fffaf7] p-6 shadow-2xl">
        <h2 class="font-display text-xl font-bold">新しい投稿</h2>
        <p class="mt-1 text-[11px] font-bold tracking-widest text-[#9a83c7]">NEW MEMORY</p>
        <textarea
          value={caption}
          onInput={(e) => setCaption(e.currentTarget.value)}
          placeholder="今日の思い出は?"
          rows={3}
          class="mt-4 w-full resize-none rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
        />
        <input
          value={sticker}
          onInput={(e) => setSticker(e.currentTarget.value)}
          placeholder="ステッカー名(例:放課後クリームソーダ)"
          class="mt-3 w-full rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
        />
        <div class="mt-4 flex gap-2">
          <button
            onClick={() => setTone("lavender")}
            class={`flex-1 rounded-full py-2 text-[11px] font-bold ${
              tone === "lavender"
                ? "bg-[#e4dafa] text-[#5a438e] ring-2 ring-[#c8b6e8]"
                : "bg-[#f3edf8] text-[#a49bad]"
            }`}
          >
            ラベンダー
          </button>
          <button
            onClick={() => setTone("coral")}
            class={`flex-1 rounded-full py-2 text-[11px] font-bold ${
              tone === "coral"
                ? "bg-[#ffb08f] text-[#7c3e36] ring-2 ring-[#ff9d7b]"
                : "bg-[#f3edf8] text-[#a49bad]"
            }`}
          >
            コーラル
          </button>
        </div>
        <div class="mt-5 flex gap-3">
          <button
            onClick={onClose}
            class="flex-1 rounded-full bg-[#f1ebf7] py-3 text-[13px] font-bold text-[#6d647d]"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={!caption.trim()}
            class="flex-1 rounded-full bg-[#f38178] py-3 text-[13px] font-bold text-white shadow-lg shadow-[#f38178]/30 disabled:opacity-40"
          >
            投稿する
          </button>
        </div>
      </div>
    </div>
  );
}
