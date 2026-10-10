import type { Post } from "../data";

export interface DbProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

// posts 表 join profiles 后的行形状(select '*, profiles(...)')
export interface PostRow {
  id: number;
  user_id: string;
  image_url: string;
  caption: string | null;
  place_name: string | null;
  sticker_name: string | null;
  tone: string;
  likes_count: number;
  profiles?: Pick<DbProfile, "username" | "display_name" | "avatar_url">[] | null;
}

export function mapPost(row: PostRow): Post {
  // supabase-js 无 Database 泛型时,to-one 关系也会被推断成数组
  const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    user: p?.display_name || p?.username || "unknown",
    handle: p ? `@${p.username}` : "",
    avatar: p?.avatar_url || "https://i.pravatar.cc/100?img=5",
    image: row.image_url,
    caption: row.caption ?? "",
    place: row.place_name ?? "",
    sticker: row.sticker_name || "はじめての投稿",
    likes: String(row.likes_count ?? 0),
    tone: row.tone === "coral" ? "coral" : "lavender",
  };
}
