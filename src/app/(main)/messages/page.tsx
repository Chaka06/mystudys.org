import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationList } from "@/components/messages/ConversationList";

export const metadata: Metadata = { title: "Messages — STUDY'S" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-[calc(100svh-5rem)] rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Mobile : liste uniquement */}
      <div className="w-full flex flex-col">
        <ConversationList userId={user.id} />
      </div>
    </div>
  );
}
