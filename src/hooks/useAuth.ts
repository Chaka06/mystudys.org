"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { signOutAction } from "@/app/actions/auth";

// Compteur de référence — plusieurs composants peuvent utiliser useAuth
// sans que chacun crée sa propre subscription
let activeHooks = 0;
let globalSubscription: { unsubscribe: () => void } | null = null;

async function bootstrapAuth() {
  const supabase = createClient();
  const { setUser, setProfile, setLoading, reset } = useAuthStore.getState();

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    setUser(user);
    const stored = useAuthStore.getState().profile;
    if (stored && stored.id !== user.id) setProfile(null);

    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(p);
  } else {
    reset();
  }
  setLoading(false);

  // Une seule subscription globale
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      const { setUser, setProfile, setLoading, reset } = useAuthStore.getState();

      if (session?.user) {
        setUser(session.user);
        const stored = useAuthStore.getState().profile;
        if (stored && stored.id !== session.user.id) setProfile(null);

        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(p);
      } else if (event === "SIGNED_OUT") {
        reset();
      }
      setLoading(false);
    }
  );

  globalSubscription = subscription;
}

export function useAuth() {
  const { user, profile, isLoading } = useAuthStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    activeHooks++;

    // Premier hook à monter — initialise la subscription globale
    if (!initializedRef.current && !globalSubscription) {
      initializedRef.current = true;
      bootstrapAuth();
    }

    return () => {
      activeHooks--;
      // Dernier hook démonté — libère la subscription
      if (activeHooks === 0 && globalSubscription) {
        globalSubscription.unsubscribe();
        globalSubscription = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    useAuthStore.getState().reset();
    if (globalSubscription) {
      globalSubscription.unsubscribe();
      globalSubscription = null;
    }
    await signOutAction();
  };

  return { user, profile, isLoading, signOut };
}
