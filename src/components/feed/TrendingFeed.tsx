"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostSkeleton } from "./PostSkeleton";
import type { Post } from "@/types/database.types";

export function TrendingFeed({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trending")
      .then((r) => r.json())
      .then(({ posts }) => { setPosts(posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <h1 className="text-xl font-bold">Tendances cette semaine</h1>
      </div>
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <PostSkeleton key={i} />)}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune tendance cette semaine</p>
          <p className="text-sm mt-1">Revenez après que des publications aient été likées.</p>
        </div>
      ) : (
        posts.map((post, i) => (
          <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <PostCard post={post} />
          </motion.div>
        ))
      )}
    </div>
  );
}
