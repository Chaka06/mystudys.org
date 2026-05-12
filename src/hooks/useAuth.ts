"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { signOutAction } from "@/app/actions/auth";

// Singleton — l'initialisation auth ne se fait qu'une seule fois
// même si useAuth est monté par plusieurs composants simultanément
let authBootstrapped = false;

export function useAuth() {
  const { user, profile, isLoading, setUser, setProfile, setLoading, reset } = useAuthStore();
  const mountedRef = useRef(false);

  useEffect(() => {
    // Premier composant à monter → prend en charge le bootstrap
    if (authBootstrapped) return;
    authBootstrapped = true;
    mountedRef.current = true;

    const supabase = createClient();

    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mountedRef.current) return;

      if (user) {
        setUser(user);

        const storedProfile = useAuthStore.getState().profile;
        if (storedProfile && storedProfile.id !== user.id) setProfile(null);

        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (mountedRef.current) setProfile(p);
      } else {
        if (mountedRef.current) reset();
      }

      if (mountedRef.current) setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        if (session?.user) {
          setUser(session.user);

          const storedProfile = useAuthStore.getState().profile;
          if (storedProfile && storedProfile.id !== session.user.id) setProfile(null);

          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (mountedRef.current) setProfile(p);
        } else if (event === "SIGNED_OUT") {
          reset();
          authBootstrapped = false; // Permet re-init après logout
        }

        if (mountedRef.current) setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      authBootstrapped = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    reset();
    authBootstrapped = false;
    await signOutAction();
  };

  return { user, profile, isLoading, signOut };
}
