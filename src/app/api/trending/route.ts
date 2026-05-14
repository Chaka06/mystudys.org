import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select(`*, author:profiles(id,username,full_name,avatar_url,is_verified,institution), media:post_media(*)`)
    .eq("is_deleted", false).eq("moderation_status", "approved")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("like_count", { ascending: false })
    .order("comment_count", { ascending: false })
    .limit(20);

  if (!posts?.length) return NextResponse.json({ posts: [] });

  const valid = posts.filter((p: any) => p.author !== null);
  if (!user) return NextResponse.json({ posts: valid });

  const ids = valid.map((p: any) => p.id);
  const [{ data: liked }, { data: saved }] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
    supabase.from("post_saves").select("post_id").eq("user_id", user.id).in("post_id", ids),
  ]);

  const likedSet = new Set((liked ?? []).map((l: any) => l.post_id));
  const savedSet = new Set((saved ?? []).map((s: any) => s.post_id));

  const trendRes = NextResponse.json({
    posts: valid.map((p: any) => ({ ...p, liked_by_user: likedSet.has(p.id), saved_by_user: savedSet.has(p.id) })),
  });
  trendRes.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return trendRes;
}
