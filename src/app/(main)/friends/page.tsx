import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FriendsPage } from "@/components/friends/FriendsPage";

export const metadata: Metadata = { title: "Amis" };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <FriendsPage userId={user.id} />;
}
