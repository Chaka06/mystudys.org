"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { PostCard } from "@/components/feed/PostCard";
import { PostSkeleton } from "@/components/feed/PostSkeleton";
import { useUserPosts } from "@/hooks/useFeed";

export function ProfilePostsList({
  profileId,
  currentUserId,
}: {
  profileId: string;
  currentUserId?: string;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useUserPosts(profileId, currentUserId);

  const { ref, inView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => <PostSkeleton key={i} />)}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-sm mb-1">Aucune publication</p>
        <p className="text-xs text-muted-foreground">Cet utilisateur n'a pas encore publié de contenu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i < 3 ? i * 0.05 : 0 }}
        >
          <PostCard post={post} />
        </motion.div>
      ))}
      <div ref={ref} className="py-2 flex justify-center">
        {isFetchingNextPage && <PostSkeleton />}
      </div>
    </div>
  );
}
