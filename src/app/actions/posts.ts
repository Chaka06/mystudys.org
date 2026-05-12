"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPostAction(payload: {
  content: string | null;
  post_type: string;
  subject_name?: string | null;
  professor_name?: string | null;
  academic_level?: string | null;
  exam_year?: number | null;
  event_date?: string | null;
  event_location?: string | null;
  institution?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data, error } = await supabase
    .from("posts")
    .insert({ ...payload, author_id: user.id, moderation_status: "approved" })
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
