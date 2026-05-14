import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Champs explicitement autorisés — empêche injection de champs sensibles
// (moderation_status, is_deleted, author_id, etc.)
const ALLOWED_POST_FIELDS = new Set([
  "content", "post_type", "subject_name", "professor_name",
  "academic_level", "institution", "exam_year",
  "event_date", "event_location", "event_url",
]);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const level = searchParams.get("level");
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "0");
  const limit = 10;

  let query = supabase
    .from("posts")
    .select(`
      *,
      author:profiles(id,username,full_name,avatar_url,is_verified,institution),
      media:post_media(*)
    `)
    .eq("is_deleted", false)
    .eq("moderation_status", "approved");

  if (type) query = query.eq("post_type", type);
  if (level) query = query.eq("academic_level", level);
  if (q && q.trim().length > 0 && q.trim().length <= 500) {
    query = query.ilike("content", `%${q.trim()}%`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data, page, hasMore: (data?.length ?? 0) === limit });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();

  // Whitelist stricte — seuls ces champs sont acceptés
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_POST_FIELDS.has(key)) {
      sanitized[key] = body[key];
    }
  }

  if (!sanitized.content && !sanitized.post_type) {
    return NextResponse.json({ error: "Contenu requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...sanitized,
      author_id: user.id,
      moderation_status: "approved", // Toujours imposé ici, jamais depuis le client
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data }, { status: 201 });
}
