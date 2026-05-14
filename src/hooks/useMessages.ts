"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/notificationStore";
import type { Conversation, Message } from "@/types/database.types";

export function useConversations(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const { conversations } = await fetch("/api/messages").then((r) => r.json());
      setConversations(conversations ?? []);
    } catch {}
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime — met à jour la liste quand un nouveau message arrive ou une conv change
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant_1=eq.${userId}`,
      }, () => loadConversations())
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant_2=eq.${userId}`,
      }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadConversations]);

  return { conversations, loading, setConversations };
}

export function useMessages(conversationId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const { setUnreadMessages } = useNotificationStore();

  // Chargement initial (50 derniers messages)
  // Quand on ouvre une conversation, les messages sont marqués lus côté API
  // → on recalcule le total des non lus depuis toutes les conversations
  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    fetch(`/api/messages/${conversationId}`)
      .then((r) => r.json())
      .then(({ messages: msgs, hasMore: more }) => {
        setMessages(msgs ?? []);
        setHasMore(more ?? false);
        setLoading(false);
        // Recalculer le badge total depuis l'API conversations
        fetch("/api/messages")
          .then((r) => r.json())
          .then(({ conversations }) => {
            const total = (conversations ?? []).reduce(
              (sum: number, c: any) => sum + (c.unread_count ?? 0), 0
            );
            setUnreadMessages(total);
          })
          .catch(() => {});
      })
      .catch(() => setLoading(false));
  }, [conversationId, setUnreadMessages]);

  // Charger les messages plus anciens (scroll vers le haut)
  const loadMore = useCallback(async () => {
    if (!messages.length || loadingMore || !hasMore) return;
    const oldest = messages[0]?.created_at;
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const { messages: older, hasMore: more } = await fetch(
        `/api/messages/${conversationId}?before=${encodeURIComponent(oldest)}`
      ).then((r) => r.json());
      setMessages((prev) => [...(older ?? []), ...prev]);
      setHasMore(more ?? false);
    } catch {}
    setLoadingMore(false);
  }, [conversationId, messages, loadingMore, hasMore]);

  // Abonnement Realtime Supabase
  useEffect(() => {
    if (!conversationId || !userId) return;
    const supabase = createClient();

    // Nettoyage du canal précédent
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Éviter les doublons (le sender voit déjà le message via optimistic update)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const sendMessage = useCallback(async (content: string, mediaUrl?: string) => {
    if (!content.trim() && !mediaUrl) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
      media_url: mediaUrl ?? null,
      is_read: false,
      is_deleted: false,
      is_first_message: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await fetch(`/api/messages/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), media_url: mediaUrl }),
    });

    if (res.ok) {
      const { message } = await res.json();
      if (message) {
        // Remplacer le message optimiste par la version DB (avec sender enrichi)
        setMessages((prev) => prev.map((m) => m.id === tempId ? (message as Message) : m));
      }
      // Si message est null (RLS RETURNING), le message optimiste reste affiché
    } else {
      // Rollback en cas d'erreur réseau
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }, [conversationId, userId]);

  return { messages, loading, loadingMore, hasMore, loadMore, sendMessage };
}
