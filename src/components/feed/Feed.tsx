"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { RefreshCw, Inbox } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostSkeleton } from "./PostSkeleton";
import { CreatePost } from "./CreatePost";
import { Button } from "@/components/ui/button";
import { useFeed } from "@/hooks/useFeed";
import type { Post } from "@/types/database.types";

export function Feed({ userId }: { userId: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useFeed(userId);

  const { ref: sentinelRef, inView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <CreatePost userId={userId} onPostCreated={() => refetch()} />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={() => refetch()}
            />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-4 flex justify-center">
            {isFetchingNextPage ? (
              <div className="space-y-4 w-full">
                <PostSkeleton />
              </div>
            ) : hasNextPage ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                className="text-muted-foreground"
              >
                Charger plus
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vous avez tout vu ! 🎉
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="text-center py-16 px-4">
      <div className="h-16 w-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-4">
        <Inbox className="h-8 w-8 text-brand-orange" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Votre fil est vide</h3>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
        Commencez par publier un document ou un sujet d'examen, ou ajoutez des amis pour voir leur contenu.
      </p>
      <Button size="sm" variant="soft" asChild>
        <a href="/friends">Trouver des amis</a>
      </Button>
    </div>
  );
}
