import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatePost } from "@/components/feed/CreatePost";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Nouvelle publication" };

export default async function CreatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="pb-20 lg:pb-4 space-y-4">
      <Link href="/feed" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <h1 className="text-xl font-bold font-display">Nouvelle publication</h1>
      <CreatePost userId={user!.id} />
    </div>
  );
}
