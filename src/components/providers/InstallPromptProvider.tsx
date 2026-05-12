"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, Share, Plus } from "lucide-react";

type Platform = "android" | "ios" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallPromptProvider() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem("pwa-prompt-dismissed")) return;

    const p = detectPlatform();
    setPlatform(p);

    if (p === "android") {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setTimeout(() => setShow(true), 3000);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }

    if (p === "ios") {
      setTimeout(() => setShow(true), 3000);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    setShowIOSInstructions(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
  };

  const handleInstall = async () => {
    if (platform === "android" && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
      setDeferredPrompt(null);
    } else if (platform === "ios") {
      setShowIOSInstructions(true);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100] pb-safe"
          style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${showIOSInstructions ? "0px" : "4.5rem"})` }}
        >
          {!showIOSInstructions ? (
            /* ── Bannière principale ── */
            <div className="mx-3 mb-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="shrink-0">
                  <Image src="/logostudys.png" alt="STUDY'S" width={48} height={48} className="rounded-xl" style={{ width: 48, height: 48 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">Installer STUDY'S</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Accès rapide depuis votre écran d'accueil
                  </p>
                </div>
                <button
                  onClick={dismiss}
                  className="shrink-0 p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex border-t border-gray-100">
                <button
                  onClick={dismiss}
                  className="flex-1 py-3 text-sm text-gray-500 font-medium"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-3 text-sm font-bold text-white bg-brand-orange border-l border-gray-100"
                >
                  Installer
                </button>
              </div>
            </div>
          ) : (
            /* ── Instructions iOS ── */
            <div className="mx-3 mb-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="font-bold text-sm text-gray-900">Ajouter à l'écran d'accueil</p>
                <button onClick={dismiss} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 pb-4 space-y-3">
                <Step n={1} icon={<Share className="h-4 w-4 text-blue-500" />}>
                  Appuyez sur <strong>Partager</strong> en bas de Safari
                </Step>
                <Step n={2} icon={<Plus className="h-4 w-4 text-brand-orange" />}>
                  Puis <strong>"Sur l'écran d'accueil"</strong>
                </Step>
                <Step n={3} icon={
                  <Image src="/logostudys.png" alt="" width={16} height={16} className="rounded" style={{ width: 16, height: 16 }} />
                }>
                  Confirmez avec <strong>"Ajouter"</strong>
                </Step>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
        {n}
      </div>
      <div className="h-8 w-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <p className="text-sm text-gray-600">{children}</p>
    </div>
  );
}
