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

  // Vérifier la visibilité du profil
  if (profileId !== user.id) {
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("is_public")
      .eq("id", profileId)
      .single();

    if (targetProfile && !targetProfile.is_public) {
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

  // ─── Enrichissement liked_by_user / saved_by_user ────────────────────────────
  // CORRECTION : cette étape manquait → PostCard recevait liked_by_user=undefined
  // → initialisé à false → le like de l'utilisateur n'était jamais affiché sur le profil
  // Le feed (/api/feed) le fait correctement depuis le début, le profil non.
  const ids = valid.map((p: any) => p.id);

  const [{ data: liked }, { data: saved }] = await Promise.all([
    ids.length
      ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("post_saves").select("post_id").eq("user_id", user.id).in("post_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const likedSet = new Set((liked ?? []).map((l: any) => l.post_id));
  const savedSet = new Set((saved ?? []).map((s: any) => s.post_id));

  const enriched = valid.map((p: any) => ({
    ...p,
    liked_by_user:  likedSet.has(p.id),
    saved_by_user:  savedSet.has(p.id),
    media: (p.media ?? []).sort((a: any, b: any) => a.position - b.position),
  }));

  const res = NextResponse.json({
    posts: enriched,
    nextOffset: enriched.length === limit ? offset + limit : null,
  });
  res.headers.set("Cache-Control", "private, s-maxage=10, stale-while-revalidate=30");
  return res;
}
