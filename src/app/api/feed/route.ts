import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const POST_SELECT = `
  *,
  author:profiles(id,username,full_name,avatar_url,is_verified,institution,field_of_study),
  media:post_media(*)
`;

// ─── Seuil d'activation du feed personnalisé ─────────────────────────────────
// < 100 utilisateurs  : toutes les publications, ordre chronologique
// >= 100 utilisateurs : algorithme de scoring activé
//   - Amis +35 pts
//   - Même établissement +25 pts
//   - Même filière +20 pts (similarité floue +10)
//   - Même niveau +15 pts
//   - Engagement (likes × 0.5 + commentaires × 1.5 + vues × 0.1, max 20)
//   - Récence (pénalité -2 pts/jour)
//   - Téléphones en commun → à ajouter dans get_recommended_feed quand ML prêt
const PERSONALIZED_THRESHOLD = 100;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const limit = 10;

  // Compter les utilisateurs actifs pour décider du mode
  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const usePersonalized = (userCount ?? 0) >= PERSONALIZED_THRESHOLD;

  let posts: any[] = [];

  if (usePersonalized) {
    // Feed personnalisé — algorithme de scoring Supabase RPC
    try {
      const { data: recommended } = await supabase.rpc("get_recommended_feed", {
        p_user_id: user.id,
        p_limit:   limit,
        p_offset:  offset,
      });
      if (recommended?.length > 0) {
        const ids = (recommended as { post_id: string }[]).map((r) => r.post_id);
        const { data } = await supabase
          .from("posts")
          .select(POST_SELECT)
          .in("id", ids)
          .eq("is_deleted", false)
          .eq("moderation_status", "approved");

        if (data) {
          const order = new Map(ids.map((id, i) => [id, i]));
          posts = data
            .filter((p: any) => p.author !== null)
            .sort((a: any, b: any) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
        }
      }
    } catch {}
  }

  // Feed chronologique (mode actuel < 100 users, ou fallback si RPC vide)
  if (posts.length === 0) {
    const { data, error } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("is_deleted", false)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    posts = (data ?? []).filter((p: any) => p.author !== null);
  }

  // Enrichir avec likes/sauvegardes de l'utilisateur
  const ids = posts.map((p: any) => p.id);
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

  const enriched = posts.map((p: any) => ({
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
