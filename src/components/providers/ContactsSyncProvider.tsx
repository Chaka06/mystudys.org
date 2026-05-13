"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Smartphone, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function ContactsSyncProvider() {
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Proposer la sync seulement si pas déjà fait et API disponible
    if (localStorage.getItem("contacts-synced")) return;
    if (!("contacts" in navigator)) return; // Web Contacts API non dispo
    // Délai de 10s pour ne pas surcharger l'onboarding
    const t = setTimeout(() => setShow(true), 10_000);
    return () => clearTimeout(t);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Web Contacts API — demande les numéros de téléphone
      const contacts = await (navigator as any).contacts.select(["tel"], { multiple: true });
      const phones: string[] = contacts.flatMap((c: any) => c.tel ?? []);

      if (phones.length === 0) { setSyncing(false); return; }

      const res = await fetch("/api/contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones }),
      });

      if (res.ok) {
        const { synced } = await res.json();
        setCount(synced);
        setDone(true);
        localStorage.setItem("contacts-synced", "1");
        setTimeout(() => setShow(false), 3000);
      }
    } catch {
      // Refus de permission ou erreur — on ferme silencieusement
      setShow(false);
    }
    setSyncing(false);
  };

  const dismiss = () => {
    setShow(false);
    // Proposer à nouveau dans 7 jours
    const next = Date.now() + 7 * 24 * 3600_000;
    localStorage.setItem("contacts-dismissed-until", String(next));
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 280 }}
          className="fixed bottom-0 left-0 right-0 z-[90]"
          style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 4.5rem)` }}
        >
          <div className="mx-3 mb-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {!done ? (
              <>
                <div className="flex items-start gap-3 p-4">
                  <div className="h-11 w-11 rounded-2xl bg-brand-orange/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-brand-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">
                      Trouvez des gens que vous connaissez
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Synchronisez vos contacts pour voir les publications de vos connaissances en premier et recevoir des suggestions d'amis pertinentes.
                    </p>
                  </div>
                  <button
                    onClick={dismiss}
                    className="shrink-0 p-1 rounded-full hover:bg-gray-100 text-gray-400 -mt-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-4 pb-3 space-y-2">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    🔒 Vos contacts sont hachés et ne sont jamais stockés en clair
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={dismiss}
                      className="flex-1 py-2.5 text-sm text-gray-500 font-medium border border-gray-100 rounded-xl"
                    >
                      Plus tard
                    </button>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="flex-1 py-2.5 text-sm font-bold text-white bg-brand-orange rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {syncing ? (
                        <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Smartphone className="h-4 w-4" />
                      )}
                      {syncing ? "Synchronisation…" : "Synchroniser"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4"
              >
                <CheckCircle className="h-8 w-8 text-brand-green shrink-0" />
                <div>
                  <p className="font-bold text-sm text-gray-900">Contacts synchronisés !</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {count} contact{count > 1 ? "s" : ""} analysé{count > 1 ? "s" : ""} — votre feed est maintenant personnalisé.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
