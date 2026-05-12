import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const POST_SELECT = `
  *,
  author:profiles(id,username,full_name,avatar_url,is_verified,institution,field_of_study),
  media:post_media(*)
`;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const limit = 10;

  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("is_deleted", false)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const valid = (posts ?? []).filter((p) => p.author !== null);
  const ids = valid.map((p: any) => p.id);

  // Enrichir avec likes/sauvegardes de l'utilisateur
  const [{ data: liked }, { data: saved }] = await Promise.all([
    ids.length ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("post_saves").select("post_id").eq("user_id", user.id).in("post_id", ids) : Promise.resolve({ data: [] }),
  ]);

  const likedSet = new Set((liked ?? []).map((l: any) => l.post_id));
  const savedSet = new Set((saved ?? []).map((s: any) => s.post_id));

  const enriched = valid.map((p: any) => ({
    ...p,
    liked_by_user: likedSet.has(p.id),
    saved_by_user: savedSet.has(p.id),
    media: (p.media ?? []).sort((a: any, b: any) => a.position - b.position),
  }));

  return NextResponse.json({
    posts: enriched,
    nextOffset: enriched.length === limit ? offset + limit : null,
  });
}
