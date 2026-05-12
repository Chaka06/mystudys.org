"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, UserPlus, UserCheck, Bell,
  CheckCheck, CheckCircle, XCircle, Share2, AtSign,
  BookOpen, Users, Megaphone
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { formatRelativeTime, getInitials, cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/database.types";
import { toast } from "sonner";

// ─── Configuration visuelle par type ─────────────────────────────────────────

const NOTIF_CONFIG: Record<NotificationType, {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}> = {
  like:            { icon: Heart,          color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/20",     label: "Like" },
  comment:         { icon: MessageCircle,  color: "text-brand-orange", bg: "bg-orange-50 dark:bg-orange-950/20", label: "Commentaire" },
  reply:           { icon: MessageCircle,  color: "text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20",  label: "Réponse" },
  friend_request:  { icon: UserPlus,       color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/20",   label: "Demande d'amitié" },
  friend_accepted: { icon: UserCheck,      color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/20", label: "Amitié" },
  message:         { icon: MessageCircle,  color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20", label: "Message" },
  mention:         { icon: AtSign,         color: "text-brand-orange", bg: "bg-orange-50 dark:bg-orange-950/20", label: "Mention" },
  post_share:      { icon: Share2,         color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/20", label: "Partage" },
};

// ─── Routing contextuel — la logique clé ─────────────────────────────────────

function getNotifDestination(n: Notification): string {
  switch (n.type) {

    // Demande d'amitié → profil de l'expéditeur (les boutons Accepter/Refuser sont là)
    case "friend_request":
      if (n.sender?.username) return `/profile/${n.sender.username}`;
      return "/friends?tab=requests";

    // Amitié acceptée → profil de la personne qui a accepté
    case "friend_accepted":
      if (n.sender?.username) return `/profile/${n.sender.username}`;
      return "/friends";

    // Like sur une publication → la publication exacte
    case "like":
      if (n.resource_id && n.resource_type === "post") return `/post/${n.resource_id}`;
      if (n.sender?.username) return `/profile/${n.sender.username}`;
      return "/feed";

    // Commentaire ou réponse → publication concernée + section commentaires
    case "comment":
    case "reply":
      if (n.resource_id && n.resource_type === "post") return `/post/${n.resource_id}#comments`;
      if (n.sender?.username) return `/profile/${n.sender.username}`;
      return "/feed";

    // Mention → publication ou profil selon le contexte
    case "mention":
      if (n.resource_id && n.resource_type === "post") return `/post/${n.resource_id}`;
      if (n.sender?.username) return `/profile/${n.sender.username}`;
      return "/feed";

    // Message → conversation directe si on peut la déterminer, sinon liste
    case "message":
      return "/messages";

    // Partage de publication → la publication partagée
    case "post_share":
      if (n.resource_id && n.resource_type === "post") return `/post/${n.resource_id}`;
      return "/feed";

    default:
      return "/notifications";
  }
}

// ─── Groupe de date ───────────────────────────────────────────────────────────

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const groups: Record<string, Notification[]> = { today: [], yesterday: [], week: [], older: [] };

  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (d.toDateString() === today.toDateString())     groups.today.push(n);
    else if (d.toDateString() === yesterday.toDateString()) groups.yesterday.push(n);
    else if (d >= weekAgo)                             groups.week.push(n);
    else                                               groups.older.push(n);
  }

  return [
    { label: "Aujourd'hui",         items: groups.today },
    { label: "Hier",                items: groups.yesterday },
    { label: "Cette semaine",        items: groups.week },
    { label: "Plus anciennes",       items: groups.older },
  ].filter((g) => g.items.length > 0);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function NotificationList() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupByDate(notifications);

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs text-muted-foreground hover:text-brand-orange"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Liste vide */}
      {notifications.length === 0 && <EmptyState />}

      {/* Groupes par date */}
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            {group.label}
          </h2>
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
            {group.items.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
              >
                <NotificationItem
                  notification={notif}
                  onRead={() => markAsRead(notif.id)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Item de notification ─────────────────────────────────────────────────────

function NotificationItem({ notification: n, onRead }: {
  notification: Notification;
  onRead: () => void;
}) {
  const router = useRouter();
  const config = NOTIF_CONFIG[n.type];
  const Icon = config.icon;
  const dest = getNotifDestination(n);

  // Les demandes d'amitié ont un traitement spécial si on a l'ID de l'amitié
  const isFriendRequest  = n.type === "friend_request";
  const hasFriendshipId  = isFriendRequest && n.resource_type === "friendship" && !!n.resource_id;

  const handleClick = () => {
    if (!n.is_read) onRead();
    router.push(dest);
  };

  return (
    <div
      className={cn(
        "relative px-4 py-3.5 transition-colors",
        !n.is_read ? "bg-brand-orange/5 dark:bg-brand-orange/5" : "hover:bg-muted/40",
        isFriendRequest && !n.is_read ? "bg-blue-50/60 dark:bg-blue-950/10" : ""
      )}
    >
      {/* Indicateur non lu */}
      {!n.is_read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand-orange" />
      )}

      <div className="flex items-start gap-3 pl-2">
        {/* Avatar + icône */}
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm">
            <AvatarImage src={n.sender?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-brand-orange text-white font-semibold">
              {getInitials(n.sender?.full_name ?? "S")}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-background shadow-sm",
            config.bg
          )}>
            <Icon className={cn("h-2.5 w-2.5", config.color)} />
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {/* Texte principal — cliquable vers la destination */}
          <button
            className="w-full text-left"
            onClick={handleClick}
          >
            <p className="text-sm leading-snug">
              {n.sender?.full_name && (
                <span className="font-semibold">{n.sender.full_name} </span>
              )}
              <span className="text-muted-foreground">
                {getNotifText(n)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <span className={cn("font-medium text-[10px] uppercase tracking-wide", config.color)}>
                {config.label}
              </span>
              <span>·</span>
              <span>{formatRelativeTime(n.created_at)}</span>
            </p>
          </button>

          {/* Actions inline pour demande d'amitié avec friendship_id disponible */}
          {hasFriendshipId && (
            <FriendRequestActions
              friendshipId={n.resource_id!}
              senderName={n.sender?.full_name ?? ""}
              notificationId={n.id}
              onDone={onRead}
            />
          )}

          {/* Si pas de friendship_id mais c'est une demande → lien vers le profil */}
          {isFriendRequest && !hasFriendshipId && (
            <button
              onClick={handleClick}
              className="mt-2 text-xs text-brand-orange font-medium hover:underline"
            >
              Voir le profil →
            </button>
          )}

          {/* Aperçu miniature pour les notifications de post */}
          {(n.type === "like" || n.type === "comment" || n.type === "reply") &&
            n.resource_type === "post" && n.resource_id && (
            <Link
              href={getNotifDestination(n)}
              onClick={onRead}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-orange transition-colors group"
            >
              <BookOpen className="h-3 w-3 group-hover:text-brand-orange" />
              <span>Voir la publication</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Actions inline pour les demandes d'amitié ───────────────────────────────

function FriendRequestActions({
  friendshipId,
  senderName,
  notificationId,
  onDone,
}: {
  friendshipId: string;
  senderName: string;
  notificationId: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "accepted" | "rejected" | "loading">("idle");

  const act = async (action: "accept" | "reject") => {
    setStatus("loading");
    try {
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, friendshipId }),
      });
      setStatus(action === "accept" ? "accepted" : "rejected");
      onDone();
      if (action === "accept") toast.success(`Vous êtes maintenant amis avec ${senderName} !`);
      else toast.info("Demande refusée");
    } catch {
      setStatus("idle");
      toast.error("Une erreur est survenue");
    }
  };

  if (status === "accepted") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-2 flex items-center gap-1.5 text-xs text-green-600 font-semibold"
      >
        <UserCheck className="h-3.5 w-3.5" />
        Vous êtes maintenant amis !
      </motion.div>
    );
  }

  if (status === "rejected") {
    return (
      <p className="mt-2 text-xs text-muted-foreground">Demande refusée</p>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2.5">
      <button
        onClick={() => act("accept")}
        disabled={status === "loading"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-green text-white text-xs font-semibold hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Accepter
      </button>
      <button
        onClick={() => act("reject")}
        disabled={status === "loading"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 active:scale-95 transition-all disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5" />
        Refuser
      </button>
    </div>
  );
}

// ─── Texte contextuel selon le type ──────────────────────────────────────────

function getNotifText(n: Notification): string {
  switch (n.type) {
    case "like":            return "a aimé votre publication";
    case "comment":         return "a commenté votre publication";
    case "reply":           return "a répondu à votre commentaire";
    case "friend_request":  return "souhaite vous ajouter en ami";
    case "friend_accepted": return "a accepté votre demande d'amitié";
    case "message":         return "vous a envoyé un message";
    case "mention":         return "vous a mentionné dans une publication";
    case "post_share":      return "a partagé votre publication";
    default:                return n.body ?? n.title;
  }
}

// ─── État vide ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-20 rounded-2xl border border-border/60 bg-card">
      <div className="h-16 w-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-4">
        <Bell className="h-8 w-8 text-brand-orange" />
      </div>
      <p className="font-semibold text-base mb-1">Tout est à jour !</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        Vous serez notifié ici des likes, commentaires, demandes d'amitié et messages reçus.
      </p>
    </div>
  );
}
