import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SavedPosts } from "@/components/feed/SavedPosts";

export const metadata: Metadata = { title: "Publications enregistrées" };

export default async function SavedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <SavedPosts userId={user!.id} />;
}
