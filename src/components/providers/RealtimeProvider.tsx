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
    incrementUnreadMessages,
  } = useNotificationStore();
  const channelRef    = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const msgChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

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
        // Compter le total des messages non lus dans toutes les conversations
        const total = (conversations as any[]).reduce(
          (sum: number, c: any) => sum + (c.unread_count ?? 0), 0
        );
        setUnreadMessages(total);
      }
    }).catch(() => {});

    // last_seen_at
    const updateLastSeen = () => {
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id).then(() => {});
    };
    updateLastSeen();
    const seenInterval = setInterval(updateLastSeen, 5 * 60 * 1000);

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

    // ─── Realtime messages non lus ────────────────────────────────────────────
    // Incrémenter le badge quand un message arrive dans n'importe quelle
    // conversation de l'utilisateur (seulement si envoyé par quelqu'un d'autre)
    if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current);

    const msgChannel = supabase
      .channel(`new-messages:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        const msg = payload.new as any;
        // Incrémenter uniquement les messages reçus (pas ceux envoyés par soi)
        if (msg.sender_id !== user.id) {
          incrementUnreadMessages();
        }
      })
      .subscribe();

    msgChannelRef.current = msgChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(msgChannel);
      clearInterval(seenInterval);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
