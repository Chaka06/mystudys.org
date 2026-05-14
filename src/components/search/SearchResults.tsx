"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Users, FileText, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PostCard } from "@/components/feed/PostCard";
import { PostSkeleton } from "@/components/feed/PostSkeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, cn } from "@/lib/utils";
import { ACADEMIC_LEVEL_LABELS, type Post, type Profile, type AcademicLevel } from "@/types/database.types";
import Link from "next/link";

const TABS = [
  { id: "all",          label: "Tout",            icon: Search },
  { id: "posts",        label: "Publications",     icon: FileText },
  { id: "users",        label: "Utilisateurs",     icon: Users },
  { id: "exam_subject", label: "Sujets d'examens", icon: BookOpen },
];

interface SearchResultsProps {
  query: string;
  initialType?: string;
  initialLevel?: string;
}

export function SearchResults({ query: initialQuery, initialType, initialLevel }: SearchResultsProps) {
  const router = useRouter();
  const [query, setQuery]               = useState(initialQuery);
  const [debouncedQuery, setDebounced]  = useState(initialQuery);
  const [activeTab, setActiveTab]       = useState(initialType ?? "all");
  const [level, setLevel]               = useState<AcademicLevel | "">(initialLevel as AcademicLevel ?? "");
  const [posts, setPosts]               = useState<Post[]>([]);
  const [users, setUsers]               = useState<Profile[]>([]);
  const [loading, setLoading]           = useState(false);
  const [hasSearched, setHasSearched]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Sync URL quand query ou tab changent — permet partage et navigation retour
  useEffect(() => {
    const url = new URL(window.location.href);
    if (debouncedQuery) url.searchParams.set("q", debouncedQuery);
    else url.searchParams.delete("q");
    url.searchParams.set("type", activeTab);
    if (level) url.searchParams.set("level", level);
    else url.searchParams.delete("level");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [debouncedQuery, activeTab, level, router]);

  // Recherche principale
  const search = useCallback(async () => {
    const hasQuery      = debouncedQuery.trim().length > 0;
    const hasTypeFilter = activeTab !== "all" && activeTab !== "posts" && activeTab !== "users";

    // Pas de query et pas de filtre type spécifique → vider les résultats
    if (!hasQuery && !hasTypeFilter) {
      setPosts([]);
      setUsers([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    const params = new URLSearchParams({ q: debouncedQuery.trim(), type: activeTab });
    if (level) params.set("level", level);

    const { posts: p, users: u } = await fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .catch(() => ({ posts: [], users: [] }));

    setPosts(p ?? []);
    setUsers(u ?? []);
    setLoading(false);
  }, [debouncedQuery, activeTab, level]);

  useEffect(() => { search(); }, [search]);

  // Focus automatique sur le champ de recherche au montage
  useEffect(() => {
    if (!initialQuery) inputRef.current?.focus();
  }, [initialQuery]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      {/* Input */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur py-2">
        <Input
          ref={inputRef}
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Rechercher utilisateurs, publications, matières…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-muted/50 border-0 focus-visible:ring-1"
          autoComplete="off"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              activeTab === tab.id
                ? "bg-brand-orange text-white shadow-md"
                : "bg-muted hover:bg-muted/70"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" aria-hidden />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtre niveau (sauf tab utilisateurs) */}
      {activeTab !== "users" && (
        <div className="flex gap-2">
          <Select
            value={level || "all"}
            onValueChange={(v) => setLevel(v === "all" ? "" as AcademicLevel : v as AcademicLevel)}
          >
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder="Tous les niveaux" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              {Object.entries(ACADEMIC_LEVEL_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Résultats */}
      {loading ? (
        <SearchSkeleton type={activeTab} />
      ) : !hasSearched ? (
        <EmptyPrompt />
      ) : activeTab === "users" ? (
        <UserResults users={users} query={debouncedQuery} />
      ) : (
        <PostResults posts={posts} query={debouncedQuery} activeTab={activeTab} />
      )}
    </div>
  );
}

// ─── État initial — incite à chercher ────────────────────────────────────────

function EmptyPrompt() {
  return (
    <div className="text-center py-20">
      <div className="h-16 w-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-4">
        <Search className="h-8 w-8 text-brand-orange" />
      </div>
      <p className="font-semibold text-base mb-1">Recherchez sur STUDY'S</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Trouvez des étudiants par nom ou username, des publications, des sujets d'examens…
      </p>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SearchSkeleton({ type }: { type: string }) {
  if (type === "users") {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ─── Résultats Posts ──────────────────────────────────────────────────────────

function PostResults({ posts, query, activeTab }: { posts: Post[]; query: string; activeTab: string }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">Aucun résultat</p>
        <p className="text-sm text-muted-foreground mt-1">
          {query
            ? `Aucune publication pour "${query}"`
            : `Aucun contenu dans cette catégorie`
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {posts.length} résultat{posts.length > 1 ? "s" : ""}
        {query ? ` pour "${query}"` : ""}
      </p>
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <PostCard post={post} />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Résultats Utilisateurs ───────────────────────────────────────────────────

function UserResults({ users, query }: { users: Profile[]; query: string }) {
  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">Aucun utilisateur trouvé</p>
        {query && (
          <p className="text-sm text-muted-foreground mt-1">
            Aucun résultat pour "{query}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {users.length} utilisateur{users.length > 1 ? "s" : ""}
        {query ? ` pour "${query}"` : ""}
      </p>
      {users.map((user, i) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Card className="p-4 hover:shadow-md transition-shadow">
            <Link href={`/profile/${user.username}`} className="flex items-center gap-3 group">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
                <AvatarFallback className="bg-brand-orange text-white text-sm">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <p className="font-semibold text-sm group-hover:text-brand-orange transition-colors">
                    {user.full_name}
                  </p>
                  {user.is_verified && (
                    <span className="text-brand-orange text-xs" aria-label="Compte vérifié">✓</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                {(user.institution || user.field_of_study) && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {[user.institution, user.field_of_study].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {user.academic_level && (
                <Badge variant="soft" className="shrink-0 text-xs">
                  {ACADEMIC_LEVEL_LABELS[user.academic_level]}
                </Badge>
              )}
            </Link>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
