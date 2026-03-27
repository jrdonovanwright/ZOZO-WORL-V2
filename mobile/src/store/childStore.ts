import { create } from "zustand";
import type { ChildProfile } from "@/services/api/children";

interface ChildStore {
  children: ChildProfile[];
  /**
   * The child who is actively in a session. Set when a child taps "play"
   * on the child-select screen or when only one child exists (auto-selected).
   */
  activeChild: ChildProfile | null;

  setChildren: (children: ChildProfile[]) => void;
  addChild: (child: ChildProfile) => void;
  setActiveChild: (child: ChildProfile) => void;
  clear: () => void;
}

export const useChildStore = create<ChildStore>((set) => ({
  children: [],
  activeChild: null,

  setChildren: (children) =>
    set({
      children,
      // Auto-select if there's exactly one child — avoids a picker screen
      // for the common single-child household
      activeChild: children.length === 1 ? children[0] : null,
    }),

  addChild: (child) =>
    set((state) => ({
      children: [...state.children, child],
      activeChild: child, // new child is always the active one
    })),

  setActiveChild: (activeChild) => set({ activeChild }),

  clear: () => set({ children: [], activeChild: null }),
}));
