import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function notify(
  recipientId: string, senderId: string,
  type: string, title: string, body: string,
  resourceType?: string, resourceId?: string
) {
  const admin = await createAdminClient();
  await admin.from("notifications").insert({
    recipient_id: recipientId, sender_id: senderId,
    type, title, body,
    resource_type: resourceType ?? null,
    resource_id: resourceId ?? null,
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "friends";

  if (type === "suggestions") {
    const { data } = await supabase.rpc("get_friend_suggestions", { p_user_id: user.id, p_limit: 10 });
    if (!data?.length) return NextResponse.json({ suggestions: [] });

    const ids = data.map((s: any) => s.suggested_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
    const suggestions = (profiles ?? []).map((p: any) => ({
      ...p,
      common_friends: data.find((s: any) => s.suggested_id === p.id)?.common_friends ?? 0,
    }));
    return NextResponse.json({ suggestions });
  }

  if (type === "requests") {
    const { data } = await supabase.from("friendships")
      .select(`*, requester:profiles!requester_id(*)`)
      .eq("addressee_id", user.id).eq("status", "pending");
    return NextResponse.json({ requests: data ?? [] });
  }

  // friends
  const { data } = await supabase.from("friendships")
    .select(`*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)`)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq("status", "accepted");

  const friends = (data ?? []).map((f: any) => ({
    ...f,
    other: f.requester_id === user.id ? f.addressee : f.requester,
  }));
  return NextResponse.json({ friends });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { action, friendshipId, addresseeId } = await req.json();

  const { data: sender } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const senderName = sender?.full_name ?? "Quelqu'un";

  if (action === "send" && addresseeId) {
    // Stocker l'ID de l'amitié dans resource_id pour les actions inline dans les notifications
    const { data: fs } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: addresseeId })
      .select("id")
      .single();
    await notify(
      addresseeId, user.id,
      "friend_request",
      "Nouvelle demande d'amitié",
      `${senderName} souhaite vous ajouter en ami`,
      "friendship",        // resource_type → permet l'action inline Accept/Refuser
      fs?.id               // resource_id = friendship UUID
    );
  } else if (action === "accept" && friendshipId) {
    const { data: fs } = await supabase.from("friendships").select("requester_id").eq("id", friendshipId).single();
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    if (fs) await notify(
      fs.requester_id, user.id,
      "friend_accepted",
      "Demande acceptée !",
      `${senderName} a accepté votre demande d'amitié`,
      "profile",           // resource_type → redirige vers le profil de la personne
      user.id              // resource_id = ID de celui qui a accepté
    );
  } else if (action === "reject" && friendshipId) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
  } else if (action === "remove" && friendshipId) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
  }

  return NextResponse.json({ ok: true });
}
