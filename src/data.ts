export interface Post {
  id: number;
  user: string;
  handle: string;
  avatar: string;
  image: string;
  caption: string;
  place: string;
  sticker: string;
  likes: string;
  tone: "lavender" | "coral";
}

export const posts: Post[] = [
  {
    id: 1,
    user: "あおい",
    handle: "@ao__days",
    avatar: "https://i.pravatar.cc/100?img=47",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85",
    caption: "放課後、寄り道したら夏が始まってた。",
    place: "下北沢・クリームソーダ研究所",
    sticker: "放課後クリームソーダ",
    likes: "248",
    tone: "lavender",
  },
  {
    id: 2,
    user: "れん",
    handle: "@ren_1000",
    avatar: "https://i.pravatar.cc/100?img=12",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85",
    caption: "みんなで見た花火。今日のことは忘れない。",
    place: "多摩川サマーフェス",
    sticker: "2026 夏祭り",
    likes: "391",
    tone: "coral",
  },
];

export interface Story {
  name: string;
  image?: string;
  active?: boolean;
}

export const stories: Story[] = [
  { name: "あなた" },
  { name: "あおい", active: true, image: "https://i.pravatar.cc/100?img=47" },
  { name: "みく", active: true, image: "https://i.pravatar.cc/100?img=32" },
  { name: "れん", active: true, image: "https://i.pravatar.cc/100?img=12" },
  { name: "ゆうた", active: true, image: "https://i.pravatar.cc/100?img=68" },
];

export interface Sticker {
  emoji: string;
  label: string;
  sub: string;
  color: string;
}

export const stickers: Sticker[] = [
  { emoji: "☕", label: "放課後", sub: "カフェめぐり", color: "bg-[#f9d7c8]" },
  { emoji: "✦", label: "青春", sub: "屋上の空", color: "bg-[#dcd5fa]" },
  { emoji: "♨", label: "遠足", sub: "江ノ島さんぽ", color: "bg-[#c8e7e0]" },
  { emoji: "☼", label: "夏祭り", sub: "花火の夜", color: "bg-[#f5e2a7]" },
  { emoji: "♪", label: "音楽室", sub: "文化祭前夜", color: "bg-[#e8c9e4]" },
  { emoji: "♡", label: "はじめて", sub: "Mille記念", color: "bg-[#f5b7c6]" },
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
