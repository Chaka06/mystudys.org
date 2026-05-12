"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Users, FileText, BookOpen, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PostCard } from "@/components/feed/PostCard";
import { PostSkeleton } from "@/components/feed/PostSkeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { getInitials, cn } from "@/lib/utils";
import { ACADEMIC_LEVEL_LABELS, POST_TYPE_LABELS, type Post, type Profile, type AcademicLevel, type PostType } from "@/types/database.types";
import Link from "next/link";

const TABS = [
  { id: "all", label: "Tout", icon: Search },
  { id: "posts", label: "Publications", icon: FileText },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "exam_subject", label: "Sujets d'examens", icon: BookOpen },
];

interface SearchResultsProps {
  query: string;
  initialType?: string;
  initialLevel?: string;
}

export function SearchResults({ query: initialQuery, initialType, initialLevel }: SearchResultsProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialType ?? "all");
  const [level, setLevel] = useState<AcademicLevel | "">(initialLevel as AcademicLevel ?? "");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useCallback(async () => {
    if (!debouncedQuery.trim() && !initialType) return;
    setLoading(true);
    const params = new URLSearchParams({ q: debouncedQuery.trim(), type: activeTab });
    if (level) params.set("level", level);
    const { posts: p, users: u } = await fetch(`/api/search?${params}`).then((r) => r.json()).catch(() => ({ posts: [], users: [] }));
    setPosts(p ?? []);
    setUsers(u ?? []);
    setLoading(false);
  }, [debouncedQuery, activeTab, level, initialType]);

  useEffect(() => { search(); }, [search]);

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      {/* Search input */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur py-2">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Rechercher publications, utilisateurs, matières…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              activeTab === tab.id
                ? "bg-brand-orange text-white shadow-md"
                : "bg-muted hover:bg-muted/70"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
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

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
        </div>
      ) : activeTab === "users" ? (
        <UserResults users={users} query={debouncedQuery} />
      ) : (
        <PostResults posts={posts} query={debouncedQuery} />
      )}
    </div>
  );
}

function PostResults({ posts, query }: { posts: Post[]; query: string }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">Aucun résultat</p>
        <p className="text-sm text-muted-foreground mt-1">
          {query ? `Aucune publication pour "${query}"` : "Lancez une recherche"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{posts.length} résultat(s)</p>
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

function UserResults({ users, query }: { users: Profile[]; query: string }) {
  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">Aucun utilisateur trouvé</p>
        {query && <p className="text-sm text-muted-foreground">pour "{query}"</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{users.length} utilisateur(s)</p>
      {users.map((user, i) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="p-4">
            <Link href={`/profile/${user.username}`} className="flex items-center gap-3 group">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-semibold group-hover:text-brand-orange transition-colors">{user.full_name}</p>
                  {user.is_verified && <span className="text-brand-orange text-xs">✓</span>}
                </div>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                {(user.institution || user.field_of_study) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {user.institution}{user.institution && user.field_of_study && " · "}{user.field_of_study}
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
