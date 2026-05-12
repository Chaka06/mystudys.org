"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { UserPlus, TrendingUp } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { getInitials } from "@/lib/utils";
import { ACADEMIC_LEVEL_LABELS, type Profile } from "@/types/database.types";
import { toast } from "sonner";

interface SuggestedUser extends Profile {
  common_friends?: number;
}

export function RightSidebar() {
  const pathname = usePathname();
  const { profile } = useAuthStore();

  // Tous les hooks AVANT tout return conditionnel (Rules of Hooks)
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ne pas charger sur les pages de messagerie
    if (pathname.startsWith("/messages")) return;
    if (!profile) return;
    fetch("/api/friends?type=suggestions")
      .then((r) => r.json())
      .then(({ suggestions }) => { setSuggestions((suggestions ?? []).slice(0, 5)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddFriend = async (userId: string, name: string) => {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", addresseeId: userId }),
    });
    setSuggestions((prev) => prev.filter((u) => u.id !== userId));
    toast.success(`Demande envoyée à ${name}`);
  };

  // Le return conditionnel vient APRÈS tous les hooks
  if (pathname.startsWith("/messages")) return null;

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-72 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pb-4">
      {/* Suggestions d'amis */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <UserPlus className="h-4 w-4 text-brand-orange" />
            Suggestions d'amis
          </h3>
          <Link href="/friends/suggestions" className="text-xs text-brand-orange hover:underline">
            Voir tout
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-20" />
                </div>
                <Skeleton className="h-7 w-16 rounded-xl" />
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Aucune suggestion pour l'instant
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((user) => (
              <div key={user.id} className="flex items-center gap-2">
                <Link href={`/profile/${user.username}`}>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${user.username}`}>
                    <p className="text-xs font-semibold truncate hover:text-brand-orange transition-colors">
                      {user.full_name}
                    </p>
                  </Link>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user.institution ?? user.field_of_study ?? (user.academic_level ? ACADEMIC_LEVEL_LABELS[user.academic_level] : "")}
                  </p>
                  {(user.common_friends ?? 0) > 0 && (
                    <p className="text-[10px] text-brand-orange">
                      {user.common_friends} ami(s) en commun
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="soft"
                  className="h-7 text-xs px-2 shrink-0"
                  onClick={() => handleAddFriend(user.id, user.first_name)}
                >
                  Ajouter
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending topics */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
          <TrendingUp className="h-4 w-4 text-brand-green" />
          Tendances
        </h3>
        <div className="space-y-2">
          {["Mathématiques", "Droit", "Informatique", "Économie", "Biologie"].map((topic, i) => (
            <Link
              key={topic}
              href={`/search?q=${encodeURIComponent(topic)}`}
              className="flex items-center justify-between py-1.5 hover:bg-muted px-2 rounded-lg transition-colors group"
            >
              <div>
                <p className="text-xs text-muted-foreground">#{i + 1} · Matière</p>
                <p className="text-sm font-medium group-hover:text-brand-orange transition-colors">
                  {topic}
                </p>
              </div>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-brand-green" />
            </Link>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div className="px-2">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          © 2025 STUDY'S 🇨🇮 ·{" "}
          <Link href="/about"   className="hover:text-orange-500 transition-colors">À propos</Link> ·{" "}
          <Link href="/privacy" className="hover:text-orange-500 transition-colors">Confidentialité</Link> ·{" "}
          <Link href="/terms"   className="hover:text-orange-500 transition-colors">CGU</Link> ·{" "}
          <Link href="/contact" className="hover:text-orange-500 transition-colors">Contact</Link>
        </p>
      </div>
    </aside>
  );
}
