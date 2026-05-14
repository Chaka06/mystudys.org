"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/notificationStore";
import type { Conversation, Message } from "@/types/database.types";

export function useConversations(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { setUnreadMessages } = useNotificationStore();

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const { conversations: convs } = await fetch("/api/messages").then((r) => r.json());
      setConversations(convs ?? []);
      // Recalculer le badge à chaque reload (source de vérité = API)
      const total = (convs ?? []).reduce(
        (sum: number, c: any) => sum + (c.unread_count ?? 0), 0
      );
      setUnreadMessages(total);
    } catch {}
    setLoading(false);
  }, [userId, setUnreadMessages]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime — reload quand une conversation change (nouveau message, etc.)
  // Le reload recalcule automatiquement unread_count + badge
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
  // Ensemble des IDs de messages qu'on vient d'envoyer (pour éviter les doublons Realtime)
  const sentMessageIds = useRef<Set<string>>(new Set());

  // Chargement initial + recalcul badge après lecture
  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    fetch(`/api/messages/${conversationId}`)
      .then((r) => r.json())
      .then(({ messages: msgs, hasMore: more }) => {
        setMessages(msgs ?? []);
        setHasMore(more ?? false);
        setLoading(false);
        // L'API a marqué les messages comme lus → recalculer le badge
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

  // Messages plus anciens (scroll haut)
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

  // Realtime — reçoit les messages entrants en temps réel
  useEffect(() => {
    if (!conversationId || !userId) return;
    const supabase = createClient();

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;

        // FIX BUG DOUBLON : ignorer nos propres messages
        // Ils sont déjà affichés via l'optimistic update, puis remplacés
        // par la réponse API. Si Realtime arrive avant l'API, sans ce guard
        // le message apparaîtrait 2 fois.
        if (newMsg.sender_id === userId) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, userId]);

  const sendMessage = useCallback(async (content: string, mediaUrl?: string) => {
    if (!content.trim() && !mediaUrl) return;

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
        // Enregistrer l'ID réel pour éviter le doublon Realtime
        sentMessageIds.current.add(message.id);
        setMessages((prev) => prev.map((m) => m.id === tempId ? (message as Message) : m));
        // Nettoyer après 3s (le Realtime aura eu le temps de passer)
        setTimeout(() => sentMessageIds.current.delete(message.id), 3000);
      }
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }, [conversationId, userId]);

  return { messages, loading, loadingMore, hasMore, loadMore, sendMessage };
}
