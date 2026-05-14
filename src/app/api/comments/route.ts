import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "postId requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles(id,username,full_name,avatar_url)")
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .is("parent_id", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Rate limit : 10 commentaires / minute
  if (await checkRateLimit(`comments:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes, réessayez dans une minute" }, { status: 429 });
  }

  const { post_id, content, parent_id } = await req.json();
  if (!post_id || !content?.trim()) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: "Commentaire trop long (max 2000 caractères)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id, content: content.trim(), author_id: user.id, parent_id: parent_id ?? null })
    .select("*, author:profiles(id,username,full_name,avatar_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notifier l'auteur du post
  const { data: post } = await supabase.from("posts").select("author_id").eq("id", post_id).single();
  if (post && post.author_id !== user.id) {
    const { data: sender } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    const admin = await createAdminClient();
    await admin.from("notifications").insert({
      recipient_id: post.author_id, sender_id: user.id, type: "comment",
      title: "Nouveau commentaire", body: `${sender?.full_name ?? "Quelqu'un"} a commenté votre publication`,
      resource_type: "post", resource_id: post_id,
    });
  }

  if (post && post.author_id !== user.id) {
    await sendPush(post.author_id, "Nouveau commentaire", `Quelqu'un a commenté votre publication`, `/post/${post_id}`);
  }

  return NextResponse.json({ comment: data });
}
