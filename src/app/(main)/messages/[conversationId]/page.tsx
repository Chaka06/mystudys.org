import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversation } = await supabase
    .from("conversations")
    .select(`
      *,
      p1:profiles!conversations_participant_1_fkey(id,username,first_name,full_name,avatar_url,last_seen_at),
      p2:profiles!conversations_participant_2_fkey(id,username,first_name,full_name,avatar_url,last_seen_at)
    `)
    .eq("id", conversationId)
    .single();

  if (!conversation) notFound();
  if (conversation.participant_1 !== user.id && conversation.participant_2 !== user.id) {
    redirect("/messages");
  }

  const enriched = {
    ...conversation,
    other_participant:
      conversation.participant_1 === user.id ? conversation.p2 : conversation.p1,
  };

  return (
    <div className={[
      "flex bg-card overflow-hidden",
      // Mobile : plein écran (Navbar et MobileNav sont cachées sur cette route)
      // dvh = dynamic viewport height → se réajuste quand le clavier ouvre
      "h-dvh lg:h-[calc(100svh-5rem)]",
      // Desktop : bordures et ombre
      "lg:rounded-2xl lg:border lg:border-border/60 lg:shadow-sm",
    ].join(" ")}>
      {/* Panneau gauche : liste des conversations (desktop uniquement) */}
      <div className="hidden lg:flex w-72 shrink-0 border-r border-border/60 flex-col">
        <ConversationList userId={user.id} activeId={conversationId} />
      </div>

      {/* Chat — prend tout l'espace disponible */}
      <div className="flex-1 flex flex-col min-w-0">
        <MessageThread conversation={enriched} currentUserId={user.id} />
      </div>
    </div>
  );
}
