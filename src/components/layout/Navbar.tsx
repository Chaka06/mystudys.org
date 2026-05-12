"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Search, Bell, MessageCircle, Home, Menu, X, LogOut, Settings, User, BookMarked
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { getInitials } from "@/lib/utils";

export function Navbar() {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="container flex h-14 items-center gap-3">
        {/* Logo */}
        <Link href="/feed" className="flex items-center mr-2 shrink-0">
          <Image
            src="/logostudys.png"
            alt="STUDY'S"
            width={110}
            height={98}
            style={{ width: "auto", height: "36px" }}
            className="object-contain"
            priority
          />
        </Link>

        {/* Search bar — desktop */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:flex">
          <Input
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Rechercher publications, utilisateurs, matières…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-muted/50 border-0 focus-visible:ring-1"
          />
        </form>

        <div className="flex-1 md:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Search mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Home */}
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <Link href="/feed">
              <Home className="h-5 w-5" />
            </Link>
          </Button>

          {/* Messages */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/messages">
              <MessageCircle className="h-5 w-5" />
            </Link>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="notification"
                  className="absolute -top-0.5 -right-0.5"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Link>
          </Button>

          {/* Profile menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-xl p-1 hover:bg-muted transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {profile ? getInitials(profile.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 z-50 w-56 rounded-2xl border bg-popover shadow-xl p-1"
                  >
                    {/* User info */}
                    <div className="px-3 py-2 border-b border-border/60 mb-1">
                      <p className="font-semibold text-sm truncate">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{profile?.username}</p>
                    </div>

                    <MenuItem href={profile?.username ? `/profile/${profile.username}` : "/feed"} icon={<User className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      Mon profil
                    </MenuItem>
                    <MenuItem href="/profile/settings" icon={<Settings className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      Paramètres
                    </MenuItem>
                    <MenuItem href="/saved" icon={<BookMarked className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      Enregistrés
                    </MenuItem>

                    <div className="border-t border-border/60 mt-1 pt-1">
                      <button
                        onClick={() => { setMenuOpen(false); signOut(); }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background md:hidden"
          >
            <div className="flex items-center gap-2 p-4 border-b">
              <form onSubmit={handleSearch} className="flex-1">
                <Input
                  leftIcon={<Search className="h-4 w-4" />}
                  placeholder="Rechercher…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </form>
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuItem({
  href, icon, children, onClick
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
