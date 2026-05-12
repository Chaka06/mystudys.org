"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function PushNotificationProvider() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;

        // Si déjà abonné, ne rien faire
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;

        // Demander la permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch {}
    };

    register();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
