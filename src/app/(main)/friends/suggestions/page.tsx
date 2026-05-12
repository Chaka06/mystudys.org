import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FriendsPage } from "@/components/friends/FriendsPage";

export const metadata: Metadata = { title: "Suggestions d'amis" };

export default async function SuggestionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Redirige vers /friends avec l'onglet suggestions actif
  // On réutilise le composant FriendsPage qui gère les tabs
  return <FriendsPage userId={user!.id} defaultTab="suggestions" />;
}
