import type { Post } from "../data";
import { supabase } from "./supabase";

export interface DbProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  prefecture?: string | null;
  school_started_at?: string | null;
}

// 高中生活日计数:从入学日到今天过了多少天(含入学当天)
export function schoolDayCount(start: string | null | undefined): number | null {
  if (!start) return null;
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(1, Math.floor((Date.now() - d.getTime()) / 86400000) + 1);
}

// 入学年选项:当前年往前 4 年
export function schoolYearOptions(): number[] {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2, y - 3, y - 4];
}

// 年+月 → 存库日期(取该月 1 日)
export function schoolStartFromYearMonth(year: string, month: string): string | null {
  if (!year || !month) return null;
  return `${year}-${month.padStart(2, "0")}-01`;
}

// stickers 表行
export interface StickerRow {
  id: number;
  name: string;
  emoji: string;
  label: string;
  sub: string;
  color: string;
}

// 投稿者のプロフィール情報(feed 用にバッチ取得する)
export interface ProfileLite {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

// user_id 一覧 → プロフィールマップ(client-side join 用の共有ヘルパー)
export async function fetchProfilesMap(ids: string[]): Promise<Map<string, ProfileLite>> {
  const map = new Map<string, ProfileLite>();
  const uniq = [...new Set(ids)];
  if (uniq.length === 0) return map;
  if (!supabase) return map;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", uniq);
  if (error) console.error("profiles query failed:", error.message);
  for (const p of (data ?? []) as ProfileLite[]) map.set(p.id, p);
  return map;
}

// posts 表の行(embed なし。プロフィールは別クエリで取得して mapPost に渡す)
// 理由:PostgREST の関係 embed は schema cache の状態によって失敗することがあるため、
// クライアント側 join のほうが確実
export interface PostRow {
  id: number;
  user_id: string;
  image_url: string;
  caption: string | null;
  place_name: string | null;
  sticker_name: string | null;
  sticker_emoji?: string | null;
  tone: string;
  likes_count: number;
  comments_count?: number | null;
  created_at?: string | null;
}

export function mapPost(row: PostRow, profiles: Map<string, ProfileLite>): Post {
  const p = profiles.get(row.user_id);
  return {
    id: row.id,
    userId: row.user_id,
    user: p?.display_name || p?.username || "unknown",
    handle: p ? `@${p.username}` : "",
    avatar: p?.avatar_url || "https://i.pravatar.cc/100?img=5",
    image: row.image_url,
    caption: row.caption ?? "",
    place: row.place_name ?? "",
    sticker: row.sticker_name || "はじめての投稿",
    stickerEmoji: row.sticker_emoji || "✦",
    likes: String(row.likes_count ?? 0),
    commentsCount: row.comments_count ?? 0,
    tone: row.tone === "coral" ? "coral" : "lavender",
  };
}
