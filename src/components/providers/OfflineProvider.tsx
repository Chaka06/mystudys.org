"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineProvider() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => {
      setIsOffline(false);
      setShowBack(true);
      setTimeout(() => setShowBack(false), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(isOffline || showBack) && (
        <motion.div
          key={isOffline ? "offline" : "back"}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={`fixed top-0 left-0 right-0 z-[200] pt-safe ${
            isOffline ? "bg-gray-900" : "bg-brand-green"
          }`}
        >
          <div className="flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold">
            {isOffline ? (
              <>
                <WifiOff className="h-4 w-4" />
                Pas de connexion internet
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                Connexion rétablie
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
