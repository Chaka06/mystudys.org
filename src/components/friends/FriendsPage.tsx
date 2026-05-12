"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/utils";
import { ACADEMIC_LEVEL_LABELS, type Profile, type Friendship } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Tab = "friends" | "requests" | "suggestions";
interface FriendEntry extends Friendship { other: Profile }
interface RequestEntry extends Friendship { requester: Profile }
interface SuggestionEntry extends Profile { common_friends?: number }

const callApi = (url: string, opts?: RequestInit) =>
  fetch(url, opts).then((r) => r.json()).catch(() => ({}));

export function FriendsPage({ userId, defaultTab = "friends" }: { userId: string; defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<RequestEntry[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (t: Tab, silent = false) => {
    if (!silent) setLoading(true);
    if (t === "suggestions") {
      const { suggestions } = await callApi("/api/friends?type=suggestions");
      setSuggestions(suggestions ?? []);
    } else if (t === "requests") {
      const { requests } = await callApi("/api/friends?type=requests");
      setRequests(requests ?? []);
    } else {
      const [{ friends }, { requests }] = await Promise.all([
        callApi("/api/friends?type=friends"),
        callApi("/api/friends?type=requests"),
      ]);
      setFriends(friends ?? []);
      setRequests(requests ?? []);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime — refresh silencieux (pas de skeleton) quand une amitié change
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`friendships:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `requester_id=eq.${userId}` }, () => load("friends", true))
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `addressee_id=eq.${userId}` }, () => { load("friends", true); load("requests", true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const action = async (act: string, opts: { friendshipId?: string; addresseeId?: string; name?: string }) => {
    await callApi("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, ...opts }),
    });
    if (act === "accept") { toast.success("Demande acceptée !"); load("friends"); }
    if (act === "reject") { toast.info("Demande refusée"); setRequests((p) => p.filter((r) => r.id !== opts.friendshipId)); }
    if (act === "remove") { toast.info("Ami retiré"); setFriends((p) => p.filter((f) => f.id !== opts.friendshipId)); }
    if (act === "send") { toast.success(`Demande envoyée à ${opts.name} !`); setSuggestions((p) => p.filter((u) => u.id !== opts.addresseeId)); }
  };

  const TABS = [
    { id: "friends" as Tab, label: `Amis (${friends.length})`, icon: UserCheck },
    { id: "requests" as Tab, label: `Demandes (${requests.length})`, icon: UserPlus, badge: requests.length },
    { id: "suggestions" as Tab, label: "Suggestions", icon: Users },
  ];

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <h1 className="text-xl font-bold">Amis</h1>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border relative ${tab === t.id ? "bg-orange-500 text-white border-orange-500" : "bg-white border-gray-100 text-gray-600 hover:border-gray-200"}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
            {t.badge && t.badge > 0 && tab !== t.id && (
              <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1,2,3,4].map((i) => <Card key={i} className="p-4"><div className="flex items-center gap-3"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div></div></Card>)}
        </div>
      ) : (
        <>
          {tab === "friends" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {friends.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="font-medium">Aucun ami pour l'instant</p>
                  <button onClick={() => setTab("suggestions")} className="mt-3 text-sm text-orange-500 font-semibold hover:underline">Voir les suggestions →</button>
                </div>
              ) : friends.map((f, i) => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 bg-white border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${f.other?.username}`}><Avatar className="h-12 w-12"><AvatarImage src={f.other?.avatar_url ?? undefined} /><AvatarFallback className="bg-orange-500 text-white">{getInitials(f.other?.full_name ?? "U")}</AvatarFallback></Avatar></Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${f.other?.username}`}><p className="font-semibold text-sm hover:text-orange-500 truncate">{f.other?.full_name}</p></Link>
                        <p className="text-xs text-gray-400 truncate">{f.other?.institution ?? f.other?.field_of_study ?? ""}</p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => action("remove", { friendshipId: f.id })} className="text-gray-300 hover:text-red-500 shrink-0"><UserX className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100"><UserPlus className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="font-medium">Aucune demande en attente</p></div>
              ) : requests.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 bg-white border-gray-100">
                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${r.requester?.username}`}><Avatar className="h-12 w-12"><AvatarImage src={r.requester?.avatar_url ?? undefined} /><AvatarFallback className="bg-orange-500 text-white">{getInitials(r.requester?.full_name ?? "U")}</AvatarFallback></Avatar></Link>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{r.requester?.full_name}</p>
                        <p className="text-xs text-gray-400">{r.requester?.institution ?? ""}</p>
                        {r.requester?.academic_level && <Badge variant="soft" className="text-[10px] py-0 mt-0.5">{ACADEMIC_LEVEL_LABELS[r.requester.academic_level]}</Badge>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => action("accept", { friendshipId: r.id })} className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white">Accepter</Button>
                        <Button variant="ghost" size="sm" onClick={() => action("reject", { friendshipId: r.id })} className="h-8 px-3 text-gray-400">Refuser</Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {tab === "suggestions" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {suggestions.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100"><Users className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="font-medium">Aucune suggestion disponible</p></div>
              ) : suggestions.map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-4 bg-white border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${u.username}`}><Avatar className="h-12 w-12"><AvatarImage src={u.avatar_url ?? undefined} /><AvatarFallback className="bg-green-600 text-white">{getInitials(u.full_name)}</AvatarFallback></Avatar></Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${u.username}`}><p className="font-semibold text-sm hover:text-orange-500 truncate">{u.full_name}</p></Link>
                        <p className="text-xs text-gray-400 truncate">{u.institution ?? u.field_of_study ?? ""}</p>
                        {(u.common_friends ?? 0) > 0 && <p className="text-[10px] text-orange-500 font-medium">{u.common_friends} ami(s) en commun</p>}
                      </div>
                      <Button size="sm" onClick={() => action("send", { addresseeId: u.id, name: u.first_name })} className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white text-xs shrink-0">Ajouter</Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
