import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data, error } = await supabase
    .from("notifications")
    .select("*, sender:profiles!notifications_sender_id_fkey(id,username,full_name,avatar_url)")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadCount = (data ?? []).filter((n) => !n.is_read).length;
  return NextResponse.json({ notifications: data, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { ids, markAll } = await req.json();

  if (markAll) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id);
  } else if (ids?.length) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids)
      .eq("recipient_id", user.id);
  }

  return NextResponse.json({ success: true });
}

