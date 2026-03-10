import { create } from "zustand";
import type { ViewType } from "@/types";

interface ViewState {
  activeView: ViewType;
  collapsedCategories: Set<string>;
  setActiveView: (view: ViewType) => void;
  toggleCategoryCollapse: (categoryId: string) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: "dailies",
  collapsedCategories: new Set(),

  setActiveView: (view) => set({ activeView: view }),

  toggleCategoryCollapse: (categoryId) =>
    set((state) => {
      const newCollapsed = new Set(state.collapsedCategories);
      if (newCollapsed.has(categoryId)) {
        newCollapsed.delete(categoryId);
      } else {
        newCollapsed.add(categoryId);
      }
      return { collapsedCategories: newCollapsed };
    }),
}));
