"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import type { Notification } from "@/types/database.types";
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { setNotifications, addNotification, setFriendRequestCount } = useNotificationStore();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // Chargement initial en parallèle — 1 seul fetch pour notifications + demandes d'amis
    Promise.all([
      fetch("/api/notifications").then((r) => r.json()),
      fetch("/api/friends?type=requests").then((r) => r.json()),
    ]).then(([{ notifications }, { requests }]) => {
      if (notifications) setNotifications(notifications as Notification[]);
      if (requests) setFriendRequestCount((requests as any[]).length);
    }).catch(() => {});

    // Abonnement Realtime : nouvelles notifications en temps réel
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          // Enrichir la notification avec le profil de l'expéditeur
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
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
