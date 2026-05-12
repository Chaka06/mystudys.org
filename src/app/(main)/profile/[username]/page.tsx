import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";

interface Props { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  let friendshipStatus = null;
  let friendshipId: string | undefined;
  let iAmRequester: boolean = false;

  if (user.id !== profile.id) {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`)
      .maybeSingle();
    if (friendship) {
      friendshipStatus = friendship.status;
      friendshipId = friendship.id;
      iAmRequester = friendship.requester_id === user.id;
    }
  }

  return (
    <ProfilePageClient
      profile={profile}
      currentUserId={user.id}
      isOwnProfile={user.id === profile.id}
      friendshipStatus={friendshipStatus}
      friendshipId={friendshipId}
      iAmRequester={iAmRequester}
    />
  );
}
