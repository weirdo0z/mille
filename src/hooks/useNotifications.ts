import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@supabase/supabase-js";
import { fetchProfilesMap, type ProfileLite } from "../lib/db";
import { supabase, supabaseConfigured } from "../lib/supabase";

export interface NotificationItem {
  id: number;
  type: string;
  actorName: string;
  postId: number | null;
  read: boolean;
  createdAt: string;
}

const LIMIT = 20;

export function useNotifications(session: Session | null) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!supabase || !session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, actor_id, post_id, read, created_at")
      .eq("user_id", session.user.id)
      .order("id", { ascending: false })
      .limit(LIMIT);
    if (!error && data) {
      const rows = data as {
        id: number;
        type: string;
        actor_id: string | null;
        post_id: number | null;
        read: boolean;
        created_at: string;
      }[];
      const profiles = await fetchProfilesMap(
        rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x))
      );
      setItems(
        rows.map((r) => ({
          id: r.id,
          type: r.type,
          actorName: r.actor_id
            ? (profiles.get(r.actor_id)?.display_name ||
                profiles.get(r.actor_id)?.username ||
                "だれか")
            : "だれか",
          postId: r.post_id,
          read: r.read,
          createdAt: r.created_at,
        }))
      );
      setUnread(rows.filter((r) => !r.read).length);
    }
    setLoading(false);
  }, [session]);

  // ログイン時のみロード(同一ユーザーのセッション更新では再ロードしない)
  useEffect(() => {
    if (!supabaseConfigured) return;
    if (!supabase || !session) {
      loadedRef.current = false;
      setItems([]);
      setUnread(0);
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [session, load]);

  const markAllRead = useCallback(async () => {
    if (!supabase || !session) return;
    if (unread > 0) {
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      setUnread(0);
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", session.user.id)
        .eq("read", false);
    }
  }, [session, unread]);

  // リアルタイム:新着通知でバッジを即時更新
  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    const channel = client
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: number;
            type: string;
            actor_id: string | null;
            post_id: number | null;
            created_at: string;
          };
          if (!row.actor_id) return;
          client
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", row.actor_id)
            .single()
            .then(({ data }) => {
              const p = data as ProfileLite | null;
              setItems((prev) =>
                [
                  {
                    id: row.id,
                    type: row.type,
                    actorName: p?.display_name || p?.username || "だれか",
                    postId: row.post_id,
                    read: false,
                    createdAt: row.created_at,
                  },
                  ...prev,
                ].slice(0, LIMIT)
              );
              setUnread((u) => u + 1);
            });
        }
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [session]);

  return { items, unread, loading, load, markAllRead };
}
