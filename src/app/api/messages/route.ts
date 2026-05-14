import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/messages — liste des conversations avec compteur messages non lus
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data } = await supabase
    .from("conversations")
    .select(`
      *,
      p1:profiles!conversations_participant_1_fkey(id,username,full_name,avatar_url,last_seen_at),
      p2:profiles!conversations_participant_2_fkey(id,username,full_name,avatar_url,last_seen_at)
    `)
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const convIds = (data ?? []).map((c: any) => c.id);

  // Compter les messages non lus par conversation en une seule requête
  // (messages envoyés PAR l'autre personne, non encore lus)
  let unreadMap = new Map<string, number>();
  if (convIds.length > 0) {
    const { data: unreadRows } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .eq("is_deleted", false);

    for (const row of (unreadRows ?? [])) {
      unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
    }
  }

  const conversations = (data ?? []).map((c: any) => ({
    ...c,
    other_participant: c.participant_1 === user.id ? c.p2 : c.p1,
    unread_count: unreadMap.get(c.id) ?? 0,
  }));

  return NextResponse.json({ conversations });
}

// POST /api/messages — créer ou obtenir une conversation
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { otherUserId } = await req.json();

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!otherUserId || !UUID_REGEX.test(otherUserId)) {
    return NextResponse.json({ error: "ID utilisateur invalide" }, { status: 400 });
  }
  if (otherUserId === user.id) {
    return NextResponse.json({ error: "Impossible de créer une conversation avec soi-même" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
    .maybeSingle();

  if (existing) return NextResponse.json({ conversationId: existing.id });

  const { data: created } = await supabase
    .from("conversations")
    .insert({ participant_1: user.id, participant_2: otherUserId })
    .select("id").single();

  return NextResponse.json({ conversationId: created?.id });
}
