"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Chargement initial
  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    fetch(`/api/messages/${conversationId}`)
      .then((r) => r.json())
      .then(({ messages }) => { setMessages(messages ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [conversationId]);

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

  return { messages, loading, sendMessage };
}
