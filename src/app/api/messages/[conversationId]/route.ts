import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendPush } from "@/lib/push";

// GET — messages d'une conversation
export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { conversationId } = await params;

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(conversationId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const url = new URL(req.url);
  const before = url.searchParams.get("before"); // cursor : charger messages avant cet ID
  const PAGE = 50; // 50 messages par page

  let query = supabase
    .from("messages")
    .select("*, sender:profiles(id,username,full_name,avatar_url)")
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false }) // Dernier en premier pour pagination
    .limit(PAGE);

  // Cursor-based pagination : charger les messages AVANT un timestamp donné
  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: raw } = await query;

  // Remettre en ordre chronologique pour l'affichage
  const messages = (raw ?? []).reverse();

  // Marquer comme lus via admin
  const admin = await createAdminClient();
  await admin.from("messages").update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({
    messages,
    hasMore: (raw ?? []).length === PAGE, // Il y a d'autres messages à charger
    oldestTimestamp: messages[0]?.created_at ?? null,
  });
}

// POST — envoyer un message
export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Rate limit : 30 messages / minute
  if (await checkRateLimit(`messages:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Trop de messages, attendez un moment" }, { status: 429 });
  }

  const { conversationId } = await params;
  const body = await req.json();
  const { content, media_url } = body;

  const messageText = (content ?? "").trim();

  if (!messageText && !media_url) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("is_active,participant_1,participant_2")
    .eq("id", conversationId)
    .single();

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

  // Push notification vers le destinataire (hors app, comme WhatsApp)
  if (conv && message) {
    const recipientId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
    const senderName = (message as any).sender?.full_name ?? "Quelqu'un";
    const preview = messageText
      ? messageText.slice(0, 80) + (messageText.length > 80 ? "…" : "")
      : "📎 Fichier";
    // Ne pas await pour ne pas bloquer la réponse
    sendPush(recipientId, senderName, preview, `/messages/${conversationId}`).catch(() => {});
  }

  return NextResponse.json({ message });
}
