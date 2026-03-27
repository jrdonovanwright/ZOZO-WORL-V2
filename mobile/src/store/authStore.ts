import { create } from "zustand";
import type { User } from "firebase/auth";
import type { ParentProfile } from "@/services/api/auth";

interface AuthStore {
  /** Firebase Auth user — source of truth for whether the session is alive. */
  user: User | null;
  /** Backend Firestore profile — fetched after auth succeeds. */
  parent: ParentProfile | null;
  /**
   * True while the initial auth state is being resolved. Guards routing logic
   * so we don't flash the sign-in screen before Firebase restores the session.
   */
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setParent: (parent: ParentProfile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  parent: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setParent: (parent) => set({ parent }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, parent: null, isLoading: false }),
}));
