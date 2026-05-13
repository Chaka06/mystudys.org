import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

// GET — messages d'une conversation
export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { conversationId } = await params;

  const { data: messages } = await supabase
    .from("messages")
    .select("*, sender:profiles(id,username,full_name,avatar_url)")
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(100);

  // Marquer comme lus via admin (RLS messages_update_own ne permet qu'à l'auteur de modifier)
  const admin = await createAdminClient();
  await admin.from("messages").update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({ messages: messages ?? [] });
}

// POST — envoyer un message
export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Rate limit : 30 messages / minute
  if (isRateLimited(`messages:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Trop de messages, attendez un moment" }, { status: 429 });
  }

  const { conversationId } = await params;
  const body = await req.json();
  const { content, media_url } = body;

  const messageText = (content ?? "").trim();

  if (!messageText && !media_url) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  const { data: conv } = await supabase.from("conversations").select("is_active").eq("id", conversationId).single();

  const lastMsgPreview = messageText || (media_url ? "📎 Fichier" : "");

  const { data: message } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageText,
      media_url: media_url ?? null,
      is_first_message: !conv?.is_active,
    })
    .select("*, sender:profiles(id,username,full_name,avatar_url)")
    .single();

  await supabase.from("conversations")
    .update({ last_message: lastMsgPreview, last_message_at: new Date().toISOString(), is_active: true })
    .eq("id", conversationId);

  return NextResponse.json({ message });
}
