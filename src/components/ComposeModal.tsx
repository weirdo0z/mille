import { useRef, useState } from "preact/hooks";
import { Camera, Image } from "../icons";
import type { Post, StickerView } from "../data";

export interface ComposeData {
  caption: string;
  stickerName: string;
  stickerEmoji: string;
  tone: Post["tone"];
  image: File;
}

export function ComposeModal({
  open,
  onClose,
  onSubmit,
  stickers,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ComposeData) => Promise<string | null>;
  stickers: StickerView[];
}) {
  const [caption, setCaption] = useState("");
  const [stickerLabel, setStickerLabel] = useState(stickers[0]?.label ?? "");
  const [tone, setTone] = useState<Post["tone"]>("lavender");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const stickerEmoji = stickers.find((s) => s.label === stickerLabel)?.emoji ?? "✦";

  function pickFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (busy) return;
    if (!image) {
      setError("写真を撮るか、アルバムから選んでください");
      return;
    }
    if (!caption.trim()) {
      setError("キャプションを入力してください");
      return;
    }
    setBusy(true);
    setError("");
    const err = await onSubmit({
      caption: caption.trim(),
      stickerName: stickerLabel,
      stickerEmoji,
      tone,
      image,
    });
    if (err) {
      // 失败:保留输入并展示真实错误
      setBusy(false);
      setError(err);
      return;
    }
    setBusy(false);
    // 状态复位(下次打开是全新表单)
    setCaption("");
    setTone("lavender");
    setImage(null);
    setPreview(null);
    setError("");
    onClose();
  }

  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-[#342c45]/40 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        class="relative w-full max-w-[380px] rounded-[28px] bg-[#fffaf7] p-6 shadow-2xl"
      >
        <h2 class="font-display text-xl font-bold">新しい投稿</h2>
        <p class="mt-1 text-[11px] font-bold tracking-widest text-[#9a83c7]">NEW MEMORY</p>

        {/* 图片:拍照 / 相册 */}
        {preview ? (
          <div class="relative mt-4 overflow-hidden rounded-2xl">
            <img src={preview} alt="投稿画像プレビュー" class="aspect-[1.2] w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setImage(null);
                setPreview(null);
              }}
              class="absolute right-2 top-2 rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold text-white"
            >
              変更
            </button>
          </div>
        ) : (
          <div class="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              class="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-[#f3edf8] py-5 text-[12px] font-bold text-[#6a4d92]"
            >
              <Camera class="size-6" />
              撮影する
            </button>
            <button
              type="button"
              onClick={() => albumRef.current?.click()}
              class="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-[#f3edf8] py-5 text-[12px] font-bold text-[#6a4d92]"
            >
              <Image class="size-6" />
              アルバムから
            </button>
          </div>
        )}
        {/* capture=environment:手机端直接调相机;桌面端降级为文件选择 */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          onChange={pickFile}
        />
        <input
          ref={albumRef}
          type="file"
          accept="image/*"
          class="hidden"
          onChange={pickFile}
        />

        <textarea
          value={caption}
          onInput={(e) => setCaption(e.currentTarget.value)}
          placeholder="今日の思い出は?"
          rows={2}
          class="mt-4 w-full resize-none rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
        />

        {/* 贴纸选择 */}
        <div>
          <label class="text-[10px] font-bold text-[#8d8498]">ステッカー</label>
          <select
            value={stickerLabel}
            onChange={(e) => setStickerLabel((e.currentTarget as HTMLSelectElement).value)}
            class="mt-1 w-full rounded-2xl bg-[#f3edf8] px-4 py-3 text-sm text-[#4a4157] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
          >
            {stickers.map((s) => (
              <option key={s.label} value={s.label}>
                {s.emoji} {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* 色调 */}
        <div class="mt-4 flex gap-2">
          <button
            type="button"
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
            type="button"
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

        {error && <p class="mt-2 text-[12px] font-bold text-[#e2574c]">{error}</p>}
        <div class="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            class="flex-1 rounded-full bg-[#f1ebf7] py-3 text-[13px] font-bold text-[#6d647d] disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={busy}
            class="flex-1 rounded-full bg-[#f38178] py-3 text-[13px] font-bold text-white shadow-lg shadow-[#f38178]/30 disabled:opacity-40"
          >
            {busy ? "投稿中..." : "投稿する"}
          </button>
        </div>
      </form>
    </div>
  );
}
