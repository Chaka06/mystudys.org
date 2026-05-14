import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(req.url);
  const raw   = searchParams.get("q") ?? "";
  const type  = searchParams.get("type") ?? "all";
  const level = searchParams.get("level") ?? "";

  // Échapper les caractères spéciaux PostgREST
  const q = raw.replace(/[%_,().]/g, (c) => `\\${c}`).trim();

  // Recherche de posts : autorisée avec q vide si un type spécifique est demandé
  // (ex: /search?type=exam_subject depuis la sidebar → afficher tous les sujets)
  const hasQuery     = q.length > 0;
  const hasTypeFilter = type !== "all" && type !== "posts" && type !== "users";

  const posts: any[] = [];
  const users: any[] = [];

  // ─── Recherche Posts ────────────────────────────────────────────────────────
  if (type !== "users") {
    // Sans query ET sans type spécifique → retourner vide (pas de recherche)
    if (!hasQuery && !hasTypeFilter) {
      return NextResponse.json({ posts: [], users: [] });
    }

    let query = supabase
      .from("posts")
      .select(`
        *,
        author:profiles(id,username,full_name,avatar_url,is_verified,institution),
        media:post_media(*)
      `)
      .eq("is_deleted", false)
      .eq("moderation_status", "approved");

    // Filtrer par type si spécifié
    if (type === "exam_subject")    query = query.eq("post_type", "exam_subject");
    else if (type === "event")      query = query.eq("post_type", "event");
    else if (type === "course_document") query = query.eq("post_type", "course_document");

    // Filtrer par contenu si query non vide
    if (hasQuery) {
      query = query.or(
        `content.ilike.%${q}%,subject_name.ilike.%${q}%,institution.ilike.%${q}%,professor_name.ilike.%${q}%`
      );
    }

    if (level) query = query.eq("academic_level", level);

    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(20);

    const valid = (data ?? []).filter((p: any) => p.author !== null);

    if (user && valid.length) {
      const ids = valid.map((p: any) => p.id);
      const [{ data: liked }, { data: saved }] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
        supabase.from("post_saves").select("post_id").eq("user_id", user.id).in("post_id", ids),
      ]);
      const likedSet = new Set((liked ?? []).map((l: any) => l.post_id));
      const savedSet = new Set((saved ?? []).map((s: any) => s.post_id));
      posts.push(...valid.map((p: any) => ({
        ...p,
        liked_by_user: likedSet.has(p.id),
        saved_by_user: savedSet.has(p.id),
      })));
    } else {
      posts.push(...valid);
    }
  }

  // ─── Recherche Utilisateurs ─────────────────────────────────────────────────
  if (type === "users" || type === "all") {
    // Sans query → pas de recherche utilisateurs
    if (!hasQuery) {
      return NextResponse.json({ posts, users: [] });
    }

    // Recherche en deux passes :
    // 1. Correspondances exactes sur username/nom (priorité haute)
    // 2. Correspondances partielles (priorité basse)
    // Institution EXCLUE des critères de recherche utilisateurs
    // (évite les faux positifs : chercher "Jean" ne doit pas retourner
    //  tous les utilisateurs de l'université Jean-Moulin)
    const { data: exactMatches } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url,is_verified,institution,field_of_study,academic_level,first_name,last_name")
      .or(`username.ilike.${q}%,full_name.ilike.${q}%`)
      .eq("is_public", true)
      .limit(5);

    const exactIds = new Set((exactMatches ?? []).map((p: any) => p.id));

    const { data: partialMatches } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url,is_verified,institution,field_of_study,academic_level,first_name,last_name")
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .eq("is_public", true)
      .limit(10);

    // Fusionner : correspondances exactes en premier, sans doublons
    const merged = [
      ...(exactMatches ?? []),
      ...(partialMatches ?? []).filter((p: any) => !exactIds.has(p.id)),
    ].slice(0, 10);

    users.push(...merged);
  }

  return NextResponse.json({ posts, users });
}
