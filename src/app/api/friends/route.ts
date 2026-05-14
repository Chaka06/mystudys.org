import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";
import { isRateLimited } from "@/lib/rateLimit";

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
  await sendPush(recipientId, title, body, "/notifications");
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "friends";

  if (type === "suggestions") {
    // Récupérer contacts mutuels ET suggestions amis d'amis en parallèle
    const [{ data: mutualData }, { data: suggData }] = await Promise.all([
      supabase.rpc("get_mutual_contacts", { p_user_id: user.id }),
      supabase.rpc("get_friend_suggestions", { p_user_id: user.id, p_limit: 10 }),
    ]);

    // Exclure les gens déjà amis
    const { data: existingFriends } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .in("status", ["accepted", "pending"]);

    const excludeIds = new Set([
      user.id,
      ...(existingFriends ?? []).flatMap((f: any) => [f.requester_id, f.addressee_id]),
    ]);

    // Contacts mutuels d'abord (priorité haute)
    const mutualIds = (mutualData ?? [])
      .map((m: any) => m.profile_id)
      .filter((id: string) => !excludeIds.has(id));

    // Amis d'amis ensuite
    const suggIds = (suggData ?? [])
      .map((s: any) => s.suggested_id)
      .filter((id: string) => !excludeIds.has(id) && !mutualIds.includes(id));

    const allIds = [...mutualIds, ...suggIds].slice(0, 15);
    if (!allIds.length) return NextResponse.json({ suggestions: [] });

    const { data: profiles } = await supabase.from("profiles").select("*").in("id", allIds);

    const suggestions = (profiles ?? [])
      .map((p: any) => ({
        ...p,
        common_friends: (suggData ?? []).find((s: any) => s.suggested_id === p.id)?.common_friends ?? 0,
        mutual_contact: mutualIds.includes(p.id), // Contact téléphonique mutuel
      }))
      // Contacts mutuels en tête
      .sort((a: any, b: any) => (b.mutual_contact ? 1 : 0) - (a.mutual_contact ? 1 : 0));

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

  // Validation UUID pour éviter injections PostgREST
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (addresseeId  && !UUID.test(addresseeId))  return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  if (friendshipId && !UUID.test(friendshipId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const { data: sender } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const senderName = sender?.full_name ?? "Quelqu'un";

  if (action === "send" && addresseeId) {
    // Rate limit : 20 demandes d'amitié par heure
    if (isRateLimited(`friend-send:${user.id}`, 20, 3600_000)) {
      return NextResponse.json({ error: "Trop de demandes d'amitié. Réessayez plus tard." }, { status: 429 });
    }
    // Vérifier qu'il n'existe pas déjà une amitié dans n'importe quel sens
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      // Amitié ou demande déjà existante — ne rien faire
      return NextResponse.json({ ok: true, existing: true });
    }

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
