import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/types/database.types";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ user: null, profile: null, isLoading: false }),
    }),
    {
      name: "studys-auth",
      // On ne persiste que le profil ET l'userId pour pouvoir détecter les incohérences
      partialize: (state) => ({
        profile: state.profile,
        // Stocker l'ID de l'utilisateur courant permet de détecter si le profil
        // appartient bien à l'utilisateur actuellement connecté
        _persistedUserId: state.profile?.id ?? null,
      }),
      // Validation à l'hydratation : si le profil persisté ne correspond pas
      // à la session Supabase actuelle, on ignore le profil périmé
      merge: (persisted: any, current) => {
        // On restaure le profil uniquement — la vérification d'appartenance
        // est faite dans useAuth.ts (profile.id === user.id)
        return {
          ...current,
          profile: persisted?.profile ?? null,
        };
      },
    }
  )
);
