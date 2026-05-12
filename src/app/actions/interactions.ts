"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

async function notify(recipientId: string, senderId: string, type: string, title: string, body: string, resourceType?: string, resourceId?: string) {
  if (recipientId === senderId) return;
  const admin = await createAdminClient();
  await admin.from("notifications").insert({ recipient_id: recipientId, sender_id: senderId, type, title, body, resource_type: resourceType, resource_id: resourceId });
}

export async function toggleLikeAction(postId: string, liked: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (liked) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    // Notifier l'auteur du post
    const { data: post } = await supabase.from("posts").select("author_id").eq("id", postId).single();
    if (post) {
      const { data: sender } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      await notify(post.author_id, user.id, "like", "Nouveau like", `${sender?.full_name ?? "Quelqu'un"} a aimé votre publication`, "post", postId);
    }
  }
  return { ok: true };
}

export async function toggleSaveAction(postId: string, saved: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (saved) {
    await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("post_saves").insert({ post_id: postId, user_id: user.id });
  }
  return { ok: true };
}

export async function deletePostAction(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("posts").update({ is_deleted: true }).eq("id", postId).eq("author_id", user.id);
  if (error) return { error: error.message };

  // Invalider le cache du feed et du profil pour que le post disparaisse immédiatement
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/feed");
  revalidatePath("/trending");

  return { ok: true };
}

export async function reportPostAction(postId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("post_reports").insert({ post_id: postId, reporter_id: user.id, reason });
  if (error && error.code !== "23505") return { error: error.message }; // 23505 = déjà signalé
  return { ok: true };
}
