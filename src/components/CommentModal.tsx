import { useEffect, useState } from "preact/hooks";
import type { Post } from "../data";
import { fetchProfilesMap, type DbProfile } from "../lib/db";
import { supabase } from "../lib/supabase";
import { relativeTime } from "../lib/time";

export interface CommentItem {
  id: number;
  user: string;
  handle: string;
  avatar: string;
  body: string;
  createdAt: string;
}

export function CommentModal({
  post,
  currentUser,
  onClose,
  onAdded,
}: {
  post: Post;
  currentUser: DbProfile | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("comments")
        .select("id, user_id, body, created_at")
        .eq("post_id", post.id)
        .order("id", { ascending: true })
        .limit(100);
      if (!alive) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as {
        id: number;
        user_id: string;
        body: string;
        created_at: string;
      }[];
      const profiles = await fetchProfilesMap(rows.map((r) => r.user_id));
      if (!alive) return;
      setItems(
        rows.map((r) => {
          const p = profiles.get(r.user_id);
          return {
            id: r.id,
            user: p?.display_name || p?.username || "unknown",
            handle: p ? `@${p.username}` : "",
            avatar: p?.avatar_url || "https://i.pravatar.cc/100?img=5",
            body: r.body,
            createdAt: r.created_at,
          };
        })
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [post.id]);

  async function submit(e: Event) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    if (supabase) {
      const { data, error } = await supabase.rpc("add_comment", {
        p_post_id: post.id,
        p_body: text,
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      setItems((prev) => [
        ...prev,
        {
          id: data as number,
          user: currentUser?.display_name || currentUser?.username || "あなた",
          handle: currentUser ? `@${currentUser.username}` : "",
          avatar: currentUser?.avatar_url || "https://i.pravatar.cc/100?img=25",
          body: text,
          createdAt: new Date().toISOString(),
        },
      ]);
    } else {
      // demo モード:ローカルのみ
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          user: "あなた",
          handle: "",
          avatar: "https://i.pravatar.cc/100?img=25",
          body: text,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    onAdded();
    setBody("");
    setBusy(false);
  }

  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-[#342c45]/40 backdrop-blur-sm" onClick={onClose} />
      <div class="relative flex max-h-[80vh] w-full max-w-[380px] flex-col rounded-[28px] bg-[#fffaf7] p-5 shadow-2xl">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">コメント</h2>
          <button onClick={onClose} class="text-[11px] font-bold text-[#9a83c7]">
            閉じる
          </button>
        </div>
        <div class="mt-3 min-h-[200px] flex-1 space-y-4 overflow-y-auto">
          {loading ? (
            <p class="py-10 text-center text-[12px] font-bold text-[#a49bad]">読み込み中...</p>
          ) : items.length === 0 ? (
            <p class="py-10 text-center text-[12px] font-bold text-[#a49bad]">
              まだコメントはありません
            </p>
          ) : (
            items.map((c) => (
              <div key={c.id} class="flex items-start gap-2.5">
                <img src={c.avatar} alt="" class="size-8 rounded-full object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-bold text-[#352d49]">
                    {c.user} <span class="font-normal text-[#9991a9]">{c.handle}</span>
                  </p>
                  <p class="mt-0.5 break-words text-[13px] leading-relaxed text-[#4a4157]">
                    {c.body}
                  </p>
                  <p class="mt-0.5 text-[10px] text-[#b3aabf]">{relativeTime(c.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {error && <p class="mt-2 text-[12px] font-bold text-[#e2574c]">{error}</p>}
        <form onSubmit={submit} class="mt-3 flex gap-2">
          <input
            value={body}
            onInput={(e) => setBody(e.currentTarget.value)}
            placeholder="コメントを書く..."
            class="flex-1 rounded-full bg-[#f3edf8] px-4 py-2.5 text-sm text-[#4a4157] placeholder:text-[#a49bad] focus:outline-none focus:ring-2 focus:ring-[#c8b6e8]"
          />
          <button
            type="submit"
            disabled={busy || !body.trim()}
            class="rounded-full bg-[#f38178] px-4 py-2 text-[12px] font-bold text-white shadow-lg shadow-[#f38178]/30 disabled:opacity-40"
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}
