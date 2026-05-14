"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED_POST_FIELDS = new Set([
  "content", "post_type", "subject_name", "professor_name",
  "academic_level", "institution", "exam_year",
  "event_date", "event_location", "event_url",
]);

export async function createPostAction(payload: {
  content: string | null;
  post_type: string;
  subject_name?: string | null;
  professor_name?: string | null;
  academic_level?: string | null;
  exam_year?: number | null;
  event_date?: string | null;
  event_location?: string | null;
  event_url?: string | null;
  institution?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Whitelist stricte : empêche injection de champs sensibles
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (ALLOWED_POST_FIELDS.has(k)) sanitized[k] = v;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ ...sanitized, author_id: user.id, moderation_status: "approved" })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/feed");
  return { postId: data.id };
}

export async function savePostMediaAction(media: {
  post_id: string;
  media_type: "image" | "pdf";
  url: string;
  file_name: string;
  file_size: number;
  position: number;
}[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("post_media").insert(media);
  if (error) return { error: error.message };
  return { ok: true };
}
