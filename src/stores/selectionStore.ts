import { create } from "zustand";

type SelectionType = "tasks" | "meetings" | "notes";

interface SelectionState {
  isSelectionMode: boolean;
  activeSelectionType: SelectionType | null;
  selectedTaskIds: Set<string>;
  selectedMeetingIds: Set<string>;
  selectedNoteIds: Set<string>;

  // Actions
  enterSelectionMode: (type: SelectionType) => void;
  exitSelectionMode: () => void;
  toggleSelection: (type: SelectionType, id: string) => void;
  selectAll: (type: SelectionType, ids: string[]) => void;
  clearSelection: (type: SelectionType) => void;
  getSelectedIds: (type: SelectionType) => Set<string>;
  getSelectedCount: (type: SelectionType) => number;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  isSelectionMode: false,
  activeSelectionType: null,
  selectedTaskIds: new Set(),
  selectedMeetingIds: new Set(),
  selectedNoteIds: new Set(),

  enterSelectionMode: (type) =>
    set({
      isSelectionMode: true,
      activeSelectionType: type,
    }),

  exitSelectionMode: () =>
    set({
      isSelectionMode: false,
      activeSelectionType: null,
      selectedTaskIds: new Set(),
      selectedMeetingIds: new Set(),
      selectedNoteIds: new Set(),
    }),

  toggleSelection: (type, id) =>
    set((state) => {
      // Remove trailing 's' from type: "tasks" -> "Task", "meetings" -> "Meeting", "notes" -> "Note"
      const singular = type.slice(0, -1);
      const key = `selected${singular.charAt(0).toUpperCase() + singular.slice(1)}Ids` as
        | "selectedTaskIds"
        | "selectedMeetingIds"
        | "selectedNoteIds";
      const currentSet = new Set(state[key]);

      if (currentSet.has(id)) {
        currentSet.delete(id);
      } else {
        currentSet.add(id);
      }

      return { [key]: currentSet };
    }),

  selectAll: (type, ids) =>
    set(() => {
      const singular = type.slice(0, -1);
      const key = `selected${singular.charAt(0).toUpperCase() + singular.slice(1)}Ids` as
        | "selectedTaskIds"
        | "selectedMeetingIds"
        | "selectedNoteIds";
      return { [key]: new Set(ids) };
    }),

  clearSelection: (type) =>
    set(() => {
      const singular = type.slice(0, -1);
      const key = `selected${singular.charAt(0).toUpperCase() + singular.slice(1)}Ids` as
        | "selectedTaskIds"
        | "selectedMeetingIds"
        | "selectedNoteIds";
      return { [key]: new Set() };
    }),

  getSelectedIds: (type) => {
    const state = get();
    switch (type) {
      case "tasks":
        return state.selectedTaskIds;
      case "meetings":
        return state.selectedMeetingIds;
      case "notes":
        return state.selectedNoteIds;
    }
  },

  getSelectedCount: (type) => {
    return get().getSelectedIds(type).size;
  },
}));
