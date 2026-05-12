"use client";

import { useState, useEffect } from "react";
import { ProfileHeader } from "./ProfileHeader";
import { ProfilePostsList } from "./ProfilePostsList";
import { createClient } from "@/lib/supabase/client";
import type { Profile, FriendshipStatus } from "@/types/database.types";

interface Props {
  profile: Profile;
  currentUserId: string;
  friendshipStatus: FriendshipStatus | null;
  friendshipId?: string;
  iAmRequester?: boolean;
}

export function ProfilePageClient({
  profile: initialProfile,
  currentUserId,
  friendshipStatus: initialStatus,
  friendshipId: initialFriendshipId,
  iAmRequester: initialIsRequester = false,
}: Props) {
  const [profile] = useState(initialProfile);
  const [friendshipStatus, setFriendshipStatus] = useState(initialStatus);
  const [friendshipId, setFriendshipId] = useState(initialFriendshipId);
  const [iAmRequester, setIAmRequester] = useState(initialIsRequester);
  const [refreshKey, setRefreshKey] = useState(0);

  // Realtime — met à jour les boutons profil quand l'amitié change
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`friendship-profile-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        handleFriendshipChange();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFriendshipChange = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${currentUserId})`)
      .maybeSingle();
    setFriendshipStatus(data?.status ?? null);
    setFriendshipId(data?.id);
    setIAmRequester(data?.requester_id === currentUserId);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <ProfileHeader
        profile={profile}
        currentUserId={currentUserId}
        friendshipStatus={friendshipStatus}
        friendshipId={friendshipId}
        iAmRequester={iAmRequester}
        onFriendshipChange={handleFriendshipChange}
      />
      <ProfilePostsList key={refreshKey} profileId={profile.id} currentUserId={currentUserId} />
    </div>
  );
}
