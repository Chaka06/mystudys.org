import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Sécurité — cette route ne doit être appelée que par notre propre serveur
  // On vérifie la clé interne pour empêcher les appels externes malveillants
  const internalKey = req.headers.get("x-internal-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey || internalKey !== expectedKey) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { recipientId, title, body, url } = await req.json();
  if (!recipientId) return NextResponse.json({ error: "recipientId requis" }, { status: 400 });

  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", recipientId);

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) return NextResponse.json({ ok: true, sent: 0 });

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails("mailto:contact@mystudys.org", vapidPublic, vapidPrivate);

  const payload = JSON.stringify({
    title,
    body,
    url: url ?? "/notifications",
    icon: "/icons/icon-192x192.png",
  });

  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      ).catch(() => {})
    )
  );

  return NextResponse.json({ ok: true, sent: subs.length });
}
