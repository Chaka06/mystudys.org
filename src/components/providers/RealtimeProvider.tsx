"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import type { Notification } from "@/types/database.types";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const {
    setNotifications,
    addNotification,
    setFriendRequestCount,
    setUnreadMessages,
  } = useNotificationStore();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // Chargement initial : notifications + demandes d'amis + messages non lus
    Promise.all([
      fetch("/api/notifications").then((r) => r.json()),
      fetch("/api/friends?type=requests").then((r) => r.json()),
      fetch("/api/messages").then((r) => r.json()),
    ]).then(([{ notifications }, { requests }, { conversations }]) => {
      if (notifications) setNotifications(notifications as Notification[]);
      if (requests) setFriendRequestCount((requests as any[]).length);
      if (conversations) {
        const total = (conversations as any[]).reduce(
          (sum: number, c: any) => sum + (c.unread_count ?? 0), 0
        );
        setUnreadMessages(total);
      }
    }).catch(() => {});

    // last_seen_at + is_active
    const updateLastSeen = () => {
      supabase.from("profiles")
        .update({ last_seen_at: new Date().toISOString(), is_active: true })
        .eq("id", user.id).then(() => {});
    };
    const setOffline = () => {
      supabase.from("profiles").update({ is_active: false }).eq("id", user.id).then(() => {});
    };
    updateLastSeen();
    const seenInterval = setInterval(updateLastSeen, 60_000); // toutes les 1 min

    // Marquer offline quand l'onglet est caché ou fermé
    const handleVisibility = () => { if (document.hidden) setOffline(); else updateLastSeen(); };
    document.addEventListener("visibilitychange", handleVisibility);

    // ─── Realtime notifications ───────────────────────────────────────────────
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${user.id}`,
      }, async (payload) => {
        const newNotif = payload.new as Notification;
        if (newNotif.sender_id) {
          const { data: sender } = await supabase
            .from("profiles")
            .select("id,username,full_name,avatar_url")
            .eq("id", newNotif.sender_id)
            .single();
          newNotif.sender = sender as Notification["sender"] ?? undefined;
        }
        addNotification(newNotif);
      })
      .subscribe();

    channelRef.current = channel;

    // NOTE: Le badge messages n'est plus géré ici par un canal Realtime global.
    // useConversations (useMessages.ts) recharge les conversations (avec unread_count
    // exact depuis la DB) à chaque changement via les canaux filtrés par participant.
    // Cela évite d'incrémenter le badge pour des conversations qui ne concernent pas
    // l'utilisateur (bug : le canal global recevait TOUS les INSERTs de la table).

    return () => {
      supabase.removeChannel(channel);
      clearInterval(seenInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      setOffline();
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
