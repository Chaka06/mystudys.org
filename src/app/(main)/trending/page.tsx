import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendingFeed } from "@/components/feed/TrendingFeed";

export const metadata: Metadata = {
  title: "Tendances",
  description: "Découvrez les publications, sujets d'examens et ressources les plus partagés par les étudiants ivoiriens en ce moment.",
};

export default async function TrendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TrendingFeed userId={user!.id} />;
}
