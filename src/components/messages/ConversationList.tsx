"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, MessageCirclePlus, MessageCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMessageTime, getInitials, truncate, cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useMessages";
import type { Conversation } from "@/types/database.types";

interface ConversationListProps {
  userId: string;
  activeId?: string;
}

export function ConversationList({ userId, activeId }: ConversationListProps) {
  const { conversations, loading } = useConversations(userId);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const name = c.other_participant?.full_name?.toLowerCase() ?? "";
    const username = c.other_participant?.username?.toLowerCase() ?? "";
    return name.includes(search.toLowerCase()) || username.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="px-4 pt-4 pb-3 shrink-0 space-y-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Messages</h2>
          <button
            onClick={() => router.push("/search?type=users")}
            title="Nouvelle conversation"
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-brand-orange"
          >
            <MessageCirclePlus className="h-5 w-5" />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-0 text-sm focus-visible:ring-1 focus-visible:ring-brand-orange/50"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-2.5 w-10 shrink-0" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-3">
              <MessageCircle className="h-8 w-8 text-brand-orange" />
            </div>
            <p className="font-semibold text-sm mb-1">
              {search ? "Aucun résultat" : "Pas encore de messages"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {search
                ? `Aucune conversation avec "${search}"`
                : "Visitez le profil d'un étudiant pour lui envoyer un message"}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filtered.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ConversationItem conv={conv} active={activeId === conv.id} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Item de conversation ─────────────────────────────────────────────────────

function ConversationItem({ conv, active }: { conv: Conversation; active: boolean }) {
  const other = conv.other_participant;

  // Vrai compteur de messages non lus depuis l'API
  const unreadCount = conv.unread_count ?? 0;
  const isUnread = unreadCount > 0;

  return (
    <Link
      href={`/messages/${conv.id}`}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group relative",
        active
          ? "bg-brand-orange/10 border border-brand-orange/20"
          : "hover:bg-muted/60 border border-transparent"
      )}
    >
      {/* Indicateur active */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-orange rounded-r-full" />
      )}

      {/* Avatar avec indicateur en ligne (placeholder) */}
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={other?.avatar_url ?? undefined} />
          <AvatarFallback className={cn(
            "text-sm font-semibold",
            active ? "bg-brand-orange text-white" : "bg-muted"
          )}>
            {getInitials(other?.full_name ?? "U")}
          </AvatarFallback>
        </Avatar>
        {/* Point en ligne — visuel uniquement */}
        {conv.is_active && (
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={cn(
            "text-sm truncate",
            isUnread ? "font-bold text-foreground" : "font-medium text-foreground",
            active && "text-brand-orange font-semibold"
          )}>
            {other?.full_name ?? "@" + other?.username}
          </p>
          {conv.last_message_at && (
            <span className={cn(
              "text-[10px] shrink-0",
              isUnread ? "text-brand-orange font-semibold" : "text-muted-foreground"
            )}>
              {formatMessageTime(conv.last_message_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p className={cn(
            "text-xs truncate flex-1",
            isUnread ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {conv.last_message
              ? truncate(conv.last_message, 42)
              : <span className="italic">Démarrer la conversation</span>
            }
          </p>

          {/* Badge non lu avec vrai compteur */}
          {isUnread && (
            <Badge variant="notification" className="h-5 min-w-5 px-1 flex items-center justify-center shrink-0 text-[10px] font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}

          {/* Badge en attente */}
          {!conv.is_active && conv.last_message && !isUnread && (
            <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
              En attente
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
