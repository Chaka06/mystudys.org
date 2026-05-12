import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/feed/PostCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Post } from "@/types/database.types";

interface Props { params: Promise<{ postId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("content").eq("id", postId).single();
  return { title: data?.content?.slice(0, 60) ?? "Publication" };
}

export default async function PostPage({ params }: Props) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("posts")
    .select(`
      *,
      author:profiles(id,username,full_name,avatar_url,is_verified,institution,field_of_study),
      media:post_media(*)
    `)
    .eq("id", postId)
    .eq("is_deleted", false)
    .single();

  if (!post) notFound();

  const [{ data: liked }, { data: saved }] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
    supabase.from("post_saves").select("post_id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
  ]);

  const enriched: Post = {
    ...post,
    liked_by_user: !!liked,
    saved_by_user: !!saved,
    media: (post.media ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <Link href="/feed" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour au fil
      </Link>
      <PostCard post={enriched} />
    </div>
  );
}
