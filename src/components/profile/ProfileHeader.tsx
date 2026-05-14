"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, GraduationCap, Building2, Globe, MessageCircle,
  UserPlus, UserMinus, UserCheck, Settings, Users,
  CheckCircle, XCircle, Clock, ChevronDown, ShieldAlert, Loader2
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { getInitials, cn } from "@/lib/utils";
import { ACADEMIC_LEVEL_LABELS, type Profile, type FriendshipStatus } from "@/types/database.types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile?: boolean;
  friendshipStatus?: FriendshipStatus | null;
  friendshipId?: string;
  iAmRequester?: boolean;
  onFriendshipChange?: () => void;
}

type RelationState = "own" | "none" | "pending_sent" | "pending_received" | "accepted" | "blocked";

export function ProfileHeader({
  profile,
  isOwnProfile = false,
  friendshipStatus,
  friendshipId,
  iAmRequester = false,
  onFriendshipChange,
}: ProfileHeaderProps) {
  const { profile: currentUser } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwn = isOwnProfile;

  const relation: RelationState = (() => {
    if (isOwn) return "own";
    if (!friendshipStatus) return "none";
    if (friendshipStatus === "accepted") return "accepted";
    if (friendshipStatus === "blocked") return "blocked";
    if (friendshipStatus === "pending") return iAmRequester ? "pending_sent" : "pending_received";
    return "none";
  })();

  // ─── Actions — toast APRÈS confirmation serveur ──────────────────────────────

  const call = async (
    action: string,
    extra: Record<string, string> = {},
    key: string,
    successMsg?: string,
    infoMsg?: string,
  ) => {
    setLoading(key);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) throw new Error();
      if (successMsg) toast.success(successMsg);
      if (infoMsg)    toast.info(infoMsg);
      await onFriendshipChange?.();
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(null);
    }
  };

  // Guard sur friendshipId pour éviter les crashes si state race condition
  const requireFriendshipId = () => {
    if (!friendshipId) { toast.error("État invalide, rechargez la page."); return false; }
    return true;
  };

  const sendRequest   = () => call("send",   { addresseeId: profile.id }, "send",
    `Demande d'amitié envoyée à ${profile.first_name} !`);
  const cancelRequest = () => requireFriendshipId() && call("reject", { friendshipId: friendshipId! }, "cancel",
    undefined, "Demande annulée");
  const acceptRequest = () => requireFriendshipId() && call("accept", { friendshipId: friendshipId! }, "accept",
    `Vous êtes maintenant amis avec ${profile.first_name} !`);
  const rejectRequest = () => requireFriendshipId() && call("reject", { friendshipId: friendshipId! }, "reject",
    undefined, "Demande refusée");
  const removeFriend  = () => {
    setMenuOpen(false);
    if (!requireFriendshipId()) return;
    call("remove", { friendshipId: friendshipId! }, "remove", undefined, `${profile.first_name} retiré de vos amis`);
  };

  const handleMessage = async () => {
    // On ne bloque plus sur !currentUser — l'API vérifie l'auth côté serveur.
    // currentUser peut être null pendant l'hydratation du store Zustand,
    // ce qui faisait échouer silencieusement le clic sans message d'erreur.
    if (messagingLoading) return;
    setMessagingLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: profile.id }),
      });
      if (res.status === 401) {
        toast.error("Vous devez être connecté pour envoyer un message");
        router.push("/login");
        return;
      }
      if (res.ok) {
        const { conversationId } = await res.json();
        if (conversationId) router.push(`/messages/${conversationId}`);
      } else {
        toast.error("Impossible d'ouvrir la conversation");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setMessagingLoading(false);
    }
  };

  // ─── Boutons selon l'état ────────────────────────────────────────────────────

  const renderFriendArea = () => {
    if (relation === "own" || relation === "blocked") return null;

    if (relation === "none") {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Button
            onClick={sendRequest}
            loading={loading === "send"}
            aria-label={`Envoyer une demande d'amitié à ${profile.first_name}`}
            className="gap-2 bg-brand-orange hover:bg-orange-600 text-white shadow-sm shadow-orange-200 active:scale-95 transition-transform"
            size="sm"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter en ami
          </Button>
        </motion.div>
      );
    }

    if (relation === "pending_sent") {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border/60 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4 text-brand-orange animate-pulse" />
            Demande envoyée
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={cancelRequest}
            loading={loading === "cancel"}
            aria-label="Annuler la demande d'amitié"
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            Annuler
          </Button>
        </motion.div>
      );
    }

    if (relation === "pending_received") {
      return (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-xs font-semibold text-brand-orange">
            <Users className="h-3.5 w-3.5" />
            {profile.first_name} vous a envoyé une demande
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={acceptRequest}
              loading={loading === "accept"}
              size="sm"
              aria-label="Accepter la demande d'amitié"
              className="gap-1.5 bg-brand-green hover:bg-green-700 text-white shadow-sm shadow-green-200"
            >
              <CheckCircle className="h-4 w-4" />
              Accepter
            </Button>
            <Button
              onClick={rejectRequest}
              loading={loading === "reject"}
              variant="outline" size="sm"
              aria-label="Refuser la demande d'amitié"
              className="gap-1.5 hover:text-destructive hover:border-destructive/50"
            >
              <XCircle className="h-4 w-4" />
              Refuser
            </Button>
          </div>
        </motion.div>
      );
    }

    if (relation === "accepted") {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Options d'amitié"
            aria-expanded={menuOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-green/10 border border-brand-green/30 text-sm font-semibold text-brand-green hover:bg-brand-green/20 transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            Amis
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", menuOpen && "rotate-180")} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-border/60 bg-popover shadow-xl p-1.5"
                >
                  <button
                    onClick={removeFriend}
                    disabled={loading === "remove"}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <UserMinus className="h-4 w-4 text-orange-500" />
                    {loading === "remove" ? "Suppression…" : "Retirer des amis"}
                  </button>
                  <div className="border-t border-border/40 my-1" />
                  <button
                    onClick={() => { setMenuOpen(false); toast.info("Fonctionnalité bientôt disponible"); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-red-50 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Bloquer
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
      {/* Cover */}
      <div className="relative h-36 sm:h-48 bg-gradient-to-br from-orange-400 via-orange-500 to-green-500">
        {profile.cover_url && (
          <img src={profile.cover_url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        )}
        {isOwn && (
          <Button
            variant="ghost" size="icon-sm"
            aria-label="Modifier la couverture"
            className="absolute top-3 right-3 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm"
            asChild
          >
            <Link href="/profile/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {/* Avatar + Actions */}
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-3">
          <div className="relative">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={`Photo de profil de ${profile.full_name}`} />
              <AvatarFallback className="text-2xl bg-brand-orange text-white">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            {profile.is_verified && (
              <div aria-label="Compte vérifié" className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-brand-orange flex items-center justify-center ring-2 ring-background shadow-sm">
                <span className="text-white text-xs font-bold" aria-hidden>✓</span>
              </div>
            )}
          </div>

          {/* Zone actions — boutons côte à côte (Message + Ami) */}
          <div className="flex flex-row items-center gap-2 pb-1 flex-wrap justify-end">
            {!isOwn && (
              <>
                {/* Bouton Message toujours visible, côte à côte avec le bouton ami */}
                <Button
                  variant="outline" size="sm"
                  onClick={handleMessage}
                  disabled={messagingLoading}
                  aria-label={`Envoyer un message à ${profile.first_name}`}
                  className="gap-1.5 hover:border-brand-orange/50 hover:text-brand-orange"
                >
                  {messagingLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <MessageCircle className="h-4 w-4" />
                  }
                  Message
                </Button>
                {renderFriendArea()}
              </>
            )}
            {isOwn && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link href="/profile/settings">
                  <Settings className="h-4 w-4" aria-hidden />
                  Modifier le profil
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Infos profil */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{profile.full_name}</h1>
            {profile.is_verified && (
              <Badge className="bg-brand-orange/10 text-brand-orange border-brand-orange/20 text-xs">
                ✓ Vérifié
              </Badge>
            )}
            {profile.role !== "user" && (
              <Badge variant="soft" className="text-xs">
                {profile.role === "admin" ? "Admin" : "Modérateur"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
          {profile.bio && <p className="text-sm mt-2 leading-relaxed text-foreground/80">{profile.bio}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground mt-2">
            {profile.institution && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-brand-orange shrink-0" aria-hidden />
                {profile.institution}
              </span>
            )}
            {profile.field_of_study && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-brand-green shrink-0" aria-hidden />
                {profile.field_of_study}
              </span>
            )}
            {profile.academic_level && (
              <Badge variant="soft-green" className="text-xs py-0 h-5">
                {ACADEMIC_LEVEL_LABELS[profile.academic_level]}
              </Badge>
            )}
            {profile.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {profile.city}
              </span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand-orange hover:underline">
                <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Site web
              </a>
            )}
          </div>
          <div className="flex gap-6 pt-3 border-t border-border/60 mt-3">
            <Stat value={profile.post_count} label="Publications" />
            <Stat value={profile.friend_count} label="Amis" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-brand-orange">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
