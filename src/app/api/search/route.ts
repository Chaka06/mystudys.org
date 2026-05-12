import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("q") ?? "";
  // Caractères spéciaux PostgREST (.  ,  )  (  *) échappés pour éviter les filtres cassés
  const q = raw.replace(/[%_,().]/g, (c) => `\\${c}`).trim();
  const type = searchParams.get("type") ?? "all";
  const level = searchParams.get("level") ?? "";

  if (!raw.trim()) return NextResponse.json({ posts: [], users: [] });

  const posts: any[] = [];
  const users: any[] = [];

  if (type !== "users") {
    let query = supabase
      .from("posts")
      .select(`*, author:profiles(id,username,full_name,avatar_url,is_verified,institution), media:post_media(*)`)
      .eq("is_deleted", false).eq("moderation_status", "approved")
      .or(`content.ilike.%${q}%,subject_name.ilike.%${q}%,institution.ilike.%${q}%`)
      .limit(20);

    if (type === "exam_subject") query = query.eq("post_type", "exam_subject");
    else if (type === "posts" || type === "all") { /* tous types */ }
    if (level) query = query.eq("academic_level", level);

    const { data } = await query;
    const valid = (data ?? []).filter((p: any) => p.author !== null);

    if (user && valid.length) {
      const ids = valid.map((p: any) => p.id);
      const [{ data: liked }, { data: saved }] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
        supabase.from("post_saves").select("post_id").eq("user_id", user.id).in("post_id", ids),
      ]);
      const likedSet = new Set((liked ?? []).map((l: any) => l.post_id));
      const savedSet = new Set((saved ?? []).map((s: any) => s.post_id));
      posts.push(...valid.map((p: any) => ({ ...p, liked_by_user: likedSet.has(p.id), saved_by_user: savedSet.has(p.id) })));
    } else {
      posts.push(...valid);
    }
  }

  if (type === "users" || type === "all") {
    const { data } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url,is_verified,institution,field_of_study,academic_level")
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%,institution.ilike.%${q}%`)
      .eq("is_public", true).limit(10);
    users.push(...(data ?? []));
  }

  return NextResponse.json({ posts, users });
}
