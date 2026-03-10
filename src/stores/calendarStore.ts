import { create } from "zustand";
import { addDays, subDays } from "@/utils/dates";

export type CalendarViewMode = "3days" | "5days" | "week";

interface CalendarState {
  currentDate: Date;
  selectedEventId: string | null;
  viewMode: CalendarViewMode;
  setCurrentDate: (date: Date) => void;
  navigateWeek: (direction: "prev" | "next") => void;
  goToToday: () => void;
  setSelectedEvent: (eventId: string | null) => void;
  setViewMode: (mode: CalendarViewMode) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  currentDate: new Date(),
  selectedEventId: null,
  viewMode: "5days",

  setCurrentDate: (date) => set({ currentDate: date }),

  navigateWeek: (direction) =>
    set((state) => {
      const daysToMove = state.viewMode === "week" ? 7 : state.viewMode === "5days" ? 5 : 3;
      return {
        currentDate:
          direction === "next"
            ? addDays(state.currentDate, daysToMove)
            : subDays(state.currentDate, daysToMove),
      };
    }),

  goToToday: () => set({ currentDate: new Date() }),

  setSelectedEvent: (eventId) => set({ selectedEventId: eventId }),

  setViewMode: (viewMode) => set({ viewMode }),
}));
