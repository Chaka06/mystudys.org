import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "user") redirect("/feed");

  // Stats
  const [
    { count: userCount },
    { count: postCount },
    { count: reportCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("post_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <AdminDashboard
      stats={{ userCount: userCount ?? 0, postCount: postCount ?? 0, reportCount: reportCount ?? 0 }}
    />
  );
}
