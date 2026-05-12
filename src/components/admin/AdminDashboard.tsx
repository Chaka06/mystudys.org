"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, FileText, Flag, TrendingUp, Shield,
  CheckCircle, XCircle, Eye, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { toast } from "sonner";

interface AdminStats {
  userCount: number;
  postCount: number;
  reportCount: number;
}

interface AdminDashboardProps {
  stats: AdminStats;
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reports" | "users" | "stats">("reports");

  useEffect(() => {
    const supabase = createClient();
    const fetchReports = async () => {
      const { data } = await supabase
        .from("post_reports")
        .select(`
          *,
          post:posts(id,content,author_id,author:profiles(full_name,username)),
          reporter:profiles!post_reports_reporter_id_fkey(full_name,username)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      setReports(data ?? []);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const resolveReport = async (reportId: string, action: "approve" | "reject") => {
    const supabase = createClient();
    const report = reports.find((r) => r.id === reportId);

    if (action === "reject" && report) {
      // Supprimer le post signalé
      await supabase.from("posts").update({ moderation_status: "rejected", is_deleted: true }).eq("id", report.post_id);
    }

    await supabase.from("post_reports").update({
      status: action === "approve" ? "dismissed" : "resolved",
    }).eq("id", reportId);

    setReports((prev) => prev.filter((r) => r.id !== reportId));
    toast.success(action === "approve" ? "Signalement rejeté" : "Publication supprimée");
  };

  const STAT_CARDS = [
    { icon: Users, label: "Utilisateurs actifs", value: stats.userCount, color: "text-brand-orange", bg: "bg-brand-orange/10" },
    { icon: FileText, label: "Publications", value: stats.postCount, color: "text-brand-green", bg: "bg-brand-green/10" },
    { icon: Flag, label: "Signalements en attente", value: stats.reportCount, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-orange/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-brand-orange" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Administration</h1>
          <p className="text-sm text-muted-foreground">Dashboard de modération STUDY'S</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STAT_CARDS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 pt-5">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${s.bg}`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-black">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["reports", "users", "stats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t ? "bg-brand-orange text-white" : "bg-muted hover:bg-muted/70"
            }`}
          >
            {t === "reports" ? `Signalements (${stats.reportCount})` : t === "users" ? "Utilisateurs" : "Statistiques"}
          </button>
        ))}
      </div>

      {/* Reports tab */}
      {tab === "reports" && (
        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">Chargement…</p>
          ) : reports.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-10 w-10 text-brand-green mx-auto mb-2" />
              <p className="font-semibold">Aucun signalement en attente</p>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-xs">Signalé</Badge>
                      <span className="text-xs text-muted-foreground">
                        par @{report.reporter?.username} · {formatRelativeTime(report.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">Raison : {report.reason}</p>
                    {report.post?.content && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 truncate">
                        {report.post.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Auteur : @{report.post?.author?.username}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resolveReport(report.id, "approve")}
                      className="text-brand-green"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resolveReport(report.id, "reject")}
                      className="text-red-500"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
