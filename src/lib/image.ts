// アップロード前の画像圧縮:
// - 長辺を maxDim に縮小、JPEG quality で再エンコード
// - GIF はそのまま(アニメ維持)
// - 小さい画像(長辺 maxDim 以下 かつ 500KB 未満)もそのまま
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.85
): Promise<Blob> {
  if (file.type === "image/gif") return file;

  let source: ImageBitmap | HTMLImageElement;
  let w: number;
  let h: number;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    source = bmp;
    w = bmp.width;
    h = bmp.height;
  } catch {
    // フォールバック: ImageBitmap 非対応環境は HTMLImageElement + objectURL
    const url = URL.createObjectURL(file);
    const el = new Image();
    await new Promise<void>((resolve, reject) => {
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("image decode failed"));
      el.src = url;
    });
    URL.revokeObjectURL(url);
    source = el;
    w = el.naturalWidth;
    h = el.naturalHeight;
  }

  const closeSource = () => {
    if (source instanceof ImageBitmap) source.close();
  };

  const scale = Math.min(1, maxDim / Math.max(w, h));
  if (scale === 1 && file.size < 500 * 1024) {
    closeSource();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    closeSource();
    return file;
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  closeSource();
  return blob ?? file;
}
