import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Feed } from "@/components/feed/Feed";

export const metadata: Metadata = {
  title: "Fil d'actualité",
  description: "Votre fil d'actualité STUDY'S — suivez les publications de vos amis et découvrez de nouvelles ressources académiques.",
  robots: { index: false },
};

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <Feed userId={user.id} />;
}
