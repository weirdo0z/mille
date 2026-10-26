export interface Post {
  id: number;
  userId: string;
  user: string;
  handle: string;
  avatar: string;
  image: string;
  caption: string;
  place: string;
  sticker: string;
  stickerEmoji: string;
  likes: string;
  commentsCount: number;
  tone: "lavender" | "coral";
}

export const posts: Post[] = [
  {
    id: 1,
    userId: "u1",
    user: "あおい",
    handle: "@ao__days",
    avatar: "https://i.pravatar.cc/100?img=47",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85",
    caption: "放課後、寄り道したら夏が始まってた。",
    place: "下北沢・クリームソーダ研究所",
    sticker: "放課後クリームソーダ",
    stickerEmoji: "☕",
    likes: "248",
    commentsCount: 12,
    tone: "lavender",
  },
  {
    id: 2,
    userId: "u2",
    user: "れん",
    handle: "@ren_1000",
    avatar: "https://i.pravatar.cc/100?img=12",
    image:
      "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?auto=format&fit=crop&w=900&q=85",
    caption: "みんなで見た花火。今日のことは忘れない。",
    place: "多摩川サマーフェス",
    sticker: "2026 夏祭り",
    stickerEmoji: "☼",
    likes: "391",
    commentsCount: 8,
    tone: "coral",
  },
];

export interface Sticker {
  emoji: string;
  label: string;
  sub: string;
  color: string;
}

// 图鉴页的展示形态:DB 目录 + 是否已收集
// color 为纯 hex(渲染用 inline style,避免 Tailwind 扫描不到动态类名)
export interface StickerView extends Sticker {
  collected: boolean;
}

export const stickers: Sticker[] = [
  { emoji: "☕", label: "放課後", sub: "カフェめぐり", color: "#f9d7c8" },
  { emoji: "✦", label: "青春", sub: "屋上の空", color: "#dcd5fa" },
  { emoji: "♨", label: "遠足", sub: "江ノ島さんぽ", color: "#c8e7e0" },
  { emoji: "☼", label: "夏祭り", sub: "花火の夜", color: "#f5e2a7" },
  { emoji: "♪", label: "音楽室", sub: "文化祭前夜", color: "#e8c9e4" },
  { emoji: "♡", label: "はじめて", sub: "Mille記念", color: "#f5b7c6" },
];

export const spots: { image: string; name: string }[] = [
  {
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=80",
    name: "喫茶 月灯り",
  },
  {
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=500&q=80",
    name: "夏の屋上映画祭",
  },
  {
    image:
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=500&q=80",
    name: "ひみつの花火",
  },
  {
    image:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=500&q=80",
    name: "放課後ライブ",
  },
];

// 发帖时可选的图片池(复用已验证可用的图)
export const composeImages: string[] = [
  posts[0].image,
  posts[1].image,
  ...spots.map((s) => s.image),
];
