"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Inbox } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostSkeleton } from "./PostSkeleton";
import type { Post } from "@/types/database.types";

export function SavedPosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/saved")
      .then((r) => r.json())
      .then(({ posts }) => { setPosts(posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center gap-2">
        <Bookmark className="h-5 w-5 text-orange-500 fill-orange-500" />
        <h1 className="text-xl font-bold">Publications enregistrées</h1>
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <PostSkeleton key={i} />)}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-gray-100 bg-white">
          <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
            <Inbox className="h-7 w-7 text-orange-500" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">Aucune publication enregistrée</p>
          <p className="text-sm text-gray-500">Clique sur l'icône 🔖 d'une publication pour la sauvegarder ici.</p>
        </div>
      ) : (
        posts.map((post, i) => (
          <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <PostCard
              post={post}
              onDelete={(id) => setPosts((p) => p.filter((x) => x.id !== id))}
              onUnsave={(id) => setPosts((p) => p.filter((x) => x.id !== id))}
            />
          </motion.div>
        ))
      )}
    </div>
  );
}
