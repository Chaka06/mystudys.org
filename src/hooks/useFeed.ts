"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 10;

export function useFeed(userId: string) {
  return useInfiniteQuery({
    queryKey: ["feed", userId],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/feed?offset=${pageParam}`);
      if (!res.ok) return { posts: [], nextOffset: null };
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 30_000,
    enabled: !!userId,
  });
}

export function useUserPosts(profileId: string, currentUserId?: string) {
  return useInfiniteQuery({
    queryKey: ["user-posts", profileId],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/user-posts?profileId=${profileId}&offset=${pageParam}`);
      if (!res.ok) return { posts: [], nextOffset: null };
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 30_000,
    enabled: !!profileId,
  });
}
