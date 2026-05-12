"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Users, PlusSquare, Bell, User } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/feed", icon: Home, label: "Accueil" },
  { href: "/friends", icon: Users, label: "Amis" },
  { href: "/create", icon: PlusSquare, label: "Publier",  highlight: true },
  { href: "/notifications", icon: Bell, label: "Alertes", badge: true },
  { href: "/profile/me", icon: User, label: "Profil" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { profile } = useAuth();
  const [friendRequests, setFriendRequests] = useState(0);

  useEffect(() => {
    if (!profile) return;
    fetch("/api/friends?type=requests")
      .then((r) => r.json())
      .then(({ requests }) => setFriendRequests((requests ?? []).length))
      .catch(() => {});
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const href = item.href === "/profile/me"
              ? `/profile/${profile?.username ?? "me"}`
              : item.href;
            const active = pathname === href || (item.href !== "/feed" && pathname.startsWith(item.href));

            return (
              <Link key={item.href} href={href} className="relative flex flex-col items-center gap-0.5 min-w-[44px]">
                <div
                  className={`relative flex items-center justify-center ${
                    item.highlight
                      ? "w-12 h-12 rounded-2xl bg-gradient-orange shadow-lg shadow-brand-orange/30 -mt-4"
                      : "w-10 h-10"
                  }`}
                >
                  <item.icon
                    className={`${item.highlight ? "h-6 w-6 text-white" : "h-5 w-5"} ${
                      !item.highlight && active ? "text-brand-orange" : !item.highlight ? "text-muted-foreground" : ""
                    }`}
                  />
                  {item.badge && unreadCount > 0 && (
                    <Badge variant="notification" className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[9px]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                  {item.href === "/friends" && friendRequests > 0 && (
                    <Badge variant="notification" className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[9px]">
                      {friendRequests}
                    </Badge>
                  )}
                </div>
                {!item.highlight && (
                  <span className={`text-[10px] ${active ? "text-brand-orange font-semibold" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                )}
                {active && !item.highlight && (
                  <motion.div
                    layoutId="mobile-indicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-orange rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
