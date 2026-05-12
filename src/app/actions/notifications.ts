"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function createNotificationAction(params: {
  recipientId: string;
  type: string;
  title: string;
  body?: string;
  resourceType?: string;
  resourceId?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id === params.recipientId) return; // pas de notif à soi-même

  const admin = await createAdminClient();
  await admin.from("notifications").insert({
    recipient_id: params.recipientId,
    sender_id: user.id,
    type: params.type,
    title: params.title,
    body: params.body,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
  });
}
