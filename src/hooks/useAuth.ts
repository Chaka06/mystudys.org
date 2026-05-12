"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { signOutAction } from "@/app/actions/auth";

export function useAuth() {
  const { user, profile, isLoading, setUser, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      if (user) {
        setUser(user);

        // ── Correction du bug "mauvais profil sur Chrome" ──────────────────
        // Zustand persist peut conserver en localStorage le profil d'un autre
        // compte connecté précédemment. On vérifie immédiatement la cohérence.
        const storedProfile = useAuthStore.getState().profile;
        if (storedProfile && storedProfile.id !== user.id) {
          // Profil périmé d'un autre compte → on l'efface avant le fetch
          setProfile(null);
        }

        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (active) setProfile(p);
      } else {
        // Pas de session valide → on nettoie tout (y compris le localStorage)
        if (active) reset();
      }

      if (active) setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return;

        if (session?.user) {
          setUser(session.user);

          // Même protection lors du changement d'état auth (ex: login depuis LoginForm)
          const storedProfile = useAuthStore.getState().profile;
          if (storedProfile && storedProfile.id !== session.user.id) {
            setProfile(null);
          }

          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (active) setProfile(p);
        } else if (event === "SIGNED_OUT") {
          reset();
        }

        if (active) setLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    reset(); // Nettoie le store ET le localStorage immédiatement
    await signOutAction();
  };

  return { user, profile, isLoading, signOut };
}
