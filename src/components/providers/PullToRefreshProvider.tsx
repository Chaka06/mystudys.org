"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";

const THRESHOLD    = 80;  // px à tirer pour déclencher le refresh
const MAX_PULL     = 120; // px max d'étirement
const RESIST_RATIO = 0.4; // résistance au tirage (comme iOS)

export function PullToRefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Désactiver le pull-to-refresh dans les conversations (scroll vertical ≠ refresh)
  const disabled = /^\/messages\/.+/.test(pathname);
  const [pullY, setPullY]         = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const startY   = useRef(0);
  const pulling  = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const doRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setTriggered(false);
    // Vibration légère si dispo (feedback haptique)
    if ("vibrate" in navigator) navigator.vibrate(30);
    router.refresh();
    // Laisser le temps au refresh de se faire
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
    setPullY(0);
  }, [refreshing, router]);

  // Refs pour accéder à pullY et refreshing sans les mettre en dépendance
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => { pullYRef.current = pullY; }, [pullY]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 5) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) { pulling.current = false; return; }
      const capped = Math.min(delta * RESIST_RATIO, MAX_PULL);
      setPullY(capped);
      setTriggered(capped >= THRESHOLD);
      if (delta > 10) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullYRef.current >= THRESHOLD && !refreshingRef.current) {
        doRefresh();
      } else {
        setPullY(0);
        setTriggered(false);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [disabled, doRefresh]); // pullY et refreshing retirés des deps → plus d'oscillation

  const showIndicator = pullY > 10 || refreshing;
  const rotation = refreshing ? undefined : `rotate(${(pullY / MAX_PULL) * 360}deg)`;
  const opacity  = Math.min(pullY / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative">
      {/* Indicateur pull-to-refresh */}
      {showIndicator && (
        <div
          className="fixed left-1/2 z-[150] flex items-center justify-center"
          style={{
            top: Math.max(60, 60 + pullY - 40),
            transform: "translateX(-50%)",
            opacity: refreshing ? 1 : opacity,
            transition: pulling.current ? "none" : "all 0.3s ease",
          }}
        >
          <div
            className={`h-10 w-10 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center ${
              refreshing ? "animate-spin" : ""
            }`}
          >
            <RefreshCw
              className={`h-5 w-5 transition-colors ${
                triggered || refreshing ? "text-brand-orange" : "text-gray-400"
              }`}
              style={{ transform: refreshing ? undefined : rotation }}
            />
          </div>
          {triggered && !refreshing && (
            <span className="absolute -bottom-5 text-[10px] font-medium text-brand-orange whitespace-nowrap">
              Relâchez pour actualiser
            </span>
          )}
        </div>
      )}

      {/* Étirement de la page pendant le tirage */}
      <div
        style={{
          transform: `translateY(${refreshing ? 50 : pullY}px)`,
          transition: pulling.current ? "none" : "transform 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
