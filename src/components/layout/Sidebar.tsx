"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home, Users, Bookmark, Bell, MessageCircle, User,
  TrendingUp, GraduationCap, Calendar, Settings
} from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationStore } from "@/stores/notificationStore";
import { getInitials } from "@/lib/utils";

const navItems = [
  { href: "/feed", icon: Home, label: "Accueil" },
  { href: "/friends", icon: Users, label: "Amis" },
  { href: "/notifications", icon: Bell, label: "Notifications", badge: true },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/saved",   icon: Bookmark,      label: "Enregistrés" },
];

const exploreItems = [
  { href: "/search?type=exam_subject", icon: GraduationCap, label: "Sujets d'examens" },
  { href: "/search?type=event", icon: Calendar, label: "Événements" },
  { href: "/trending", icon: TrendingUp, label: "Tendances" },
];

function isHrefActive(href: string, pathname: string, searchParams: URLSearchParams): boolean {
  const [path, query] = href.split("?");
  if (!query) return pathname === path;
  const params = new URLSearchParams(query);
  return pathname === path && [...params.entries()].every(([k, v]) => searchParams.get(k) === v);
}

export function Sidebar() {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const { friendRequestCount: friendRequests } = useNotificationStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!profile) return null;

  return (
    <aside className="hidden lg:flex flex-col gap-2 w-64 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pb-4">
      {/* Profile card */}
      <Link
        href={`/profile/${profile.username}`}
        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-colors group"
      >
        <Avatar className="h-12 w-12 ring-2 ring-brand-orange/20 group-hover:ring-brand-orange/50 transition-all">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm truncate">{profile.full_name}</p>
            {profile.is_verified && (
              <span className="text-brand-orange" title="Compte vérifié">✓</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 px-1">
        <StatCard label="Publications" value={profile.post_count} />
        <StatCard label="Amis" value={profile.friend_count} />
      </div>

      <div className="border-t border-border/60 my-1" />

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={<item.icon className="h-5 w-5" />}
            label={item.label}
            active={pathname === item.href}
            badge={
              item.badge && unreadCount > 0 ? unreadCount
              : item.href === "/friends" && friendRequests > 0 ? friendRequests
              : undefined
            }
          />
        ))}
      </nav>

      <div className="border-t border-border/60 my-1" />

      {/* Explorer */}
      <div className="px-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
          Explorer
        </p>
        <nav className="space-y-1">
          {exploreItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={<item.icon className="h-5 w-5" />}
              label={item.label}
              active={isHrefActive(item.href, pathname, searchParams)}
            />
          ))}
        </nav>
      </div>

      <div className="mt-auto pt-2 border-t border-border/60 space-y-1">
        <NavLink
          href="/profile/settings"
          icon={<Settings className="h-4 w-4" />}
          label="Paramètres"
          active={pathname === "/profile/settings"}
        />
      </div>
    </aside>
  );
}

function NavLink({
  href, icon, label, active, badge
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.97 }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative ${
          active
            ? "bg-brand-orange/10 text-brand-orange font-semibold"
            : "hover:bg-muted text-foreground"
        }`}
      >
        {active && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-orange rounded-r-full"
          />
        )}
        <span className={active ? "text-brand-orange" : "text-muted-foreground"}>
          {icon}
        </span>
        <span className="text-sm">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge variant="notification" className="ml-auto">
            {badge > 99 ? "99+" : badge}
          </Badge>
        )}
      </motion.div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-xl p-2.5 text-center">
      <p className="text-lg font-bold text-brand-orange">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
