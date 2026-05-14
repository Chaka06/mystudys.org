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
  const profileId = searchParams.get("profileId");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const limit = 10;

  if (!profileId) return NextResponse.json({ error: "profileId requis" }, { status: 400 });

  // Vérifier la visibilité du profil — un profil privé n'est accessible qu'à ses amis
  if (profileId !== user.id) {
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("is_public")
      .eq("id", profileId)
      .single();

    if (targetProfile && !targetProfile.is_public) {
      // Vérifier si on est amis
      const { data: friendship } = await supabase
        .from("friendships")
        .select("id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${user.id})`)
        .eq("status", "accepted")
        .maybeSingle();

      if (!friendship) {
        return NextResponse.json({ posts: [], nextOffset: null });
      }
    }
  }

  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", profileId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const valid = (posts ?? []).filter((p) => p.author !== null);

  const res = NextResponse.json({
    posts: valid,
    nextOffset: valid.length === limit ? offset + limit : null,
  });
  res.headers.set("Cache-Control", "private, s-maxage=60, stale-while-revalidate=120");
  return res;
}
