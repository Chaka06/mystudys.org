import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { recipientId, title, body, url } = await req.json();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", recipientId);

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    "mailto:contact@mystudys.org",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const payload = JSON.stringify({ title, body, url: url ?? "/notifications", icon: "/icons/icon-192x192.png" });

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
