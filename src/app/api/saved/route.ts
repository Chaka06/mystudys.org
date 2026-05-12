import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data, error } = await supabase
    .from("post_saves")
    .select(`
      post:posts(
        *,
        author:profiles(id,username,full_name,avatar_url,is_verified,institution),
        media:post_media(*)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const valid = (data ?? [])
    .map((s: any) => s.post)
    .filter(Boolean);

  if (!valid.length) return NextResponse.json({ posts: [] });

  const ids = valid.map((p: any) => p.id);
  const { data: liked } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .in("post_id", ids);

  const likedSet = new Set((liked ?? []).map((l: any) => l.post_id));

  const posts = valid.map((p: any) => ({
    ...p,
    saved_by_user: true,
    liked_by_user: likedSet.has(p.id),
  }));

  return NextResponse.json({ posts });
}
