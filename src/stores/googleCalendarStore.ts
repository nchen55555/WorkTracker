import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GoogleAccount, GoogleCalendar } from "@/types";

interface GoogleCalendarState {
  accounts: GoogleAccount[];
  isSyncing: boolean;
  error: string | null;
  isAddingAccount: boolean; // Flag to prevent reset during account addition

  // Account management
  addAccount: (account: GoogleAccount) => void;
  removeAccount: (accountId: string) => void;
  updateAccountTokens: (accountId: string, accessToken: string, refreshToken: string | null) => void;
  setAccountLastSync: (accountId: string, time: string | null) => void;
  setIsAddingAccount: (isAdding: boolean) => void;

  // Calendar management
  setAccountCalendars: (accountId: string, calendars: GoogleCalendar[]) => void;
  toggleCalendarSelection: (accountId: string, calendarId: string) => void;
  renameCalendar: (accountId: string, calendarId: string, displayName: string) => void;

  // Sync state
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;

  // Helpers
  getAccount: (accountId: string) => GoogleAccount | undefined;
  getAllSelectedCalendars: () => { accountId: string; calendar: GoogleCalendar }[];
  isConnected: () => boolean;

  reset: () => void;
}

// Helper to wait for store rehydration
let resolveRehydration: () => void;
const rehydrationPromise = new Promise<void>((resolve) => {
  resolveRehydration = resolve;
});

export const waitForStoreRehydration = () => rehydrationPromise;

export const useGoogleCalendarStore = create<GoogleCalendarState>()(
  persist(
    (set, get) => ({
      accounts: [],
      isSyncing: false,
      error: null,
      isAddingAccount: false,

      setIsAddingAccount: (isAdding) => set({ isAddingAccount: isAdding }),

      addAccount: (account) =>
        set((state) => {
          console.log("[GoogleCalendarStore] addAccount called for:", account.email);
          // Check if account already exists (by email)
          const exists = state.accounts.some((a) => a.email === account.email);
          if (exists) {
            console.log("[GoogleCalendarStore] Account exists, updating tokens");
            // Update existing account tokens
            return {
              accounts: state.accounts.map((a) =>
                a.email === account.email
                  ? { ...a, accessToken: account.accessToken, refreshToken: account.refreshToken }
                  : a
              ),
            };
          }
          console.log("[GoogleCalendarStore] Adding new account, current count:", state.accounts.length);
          return { accounts: [...state.accounts, account] };
        }),

      removeAccount: (accountId) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== accountId),
        })),

      updateAccountTokens: (accountId, accessToken, refreshToken) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId ? { ...a, accessToken, refreshToken } : a
          ),
        })),

      setAccountLastSync: (accountId, time) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId ? { ...a, lastSyncAt: time } : a
          ),
        })),

      setAccountCalendars: (accountId, calendars) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId ? { ...a, calendars } : a
          ),
        })),

      toggleCalendarSelection: (accountId, calendarId) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId
              ? {
                  ...a,
                  calendars: a.calendars.map((cal) =>
                    cal.id === calendarId ? { ...cal, selected: !cal.selected } : cal
                  ),
                }
              : a
          ),
        })),

      renameCalendar: (accountId, calendarId, displayName) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId
              ? {
                  ...a,
                  calendars: a.calendars.map((cal) =>
                    cal.id === calendarId
                      ? { ...cal, displayName: displayName.trim() || undefined }
                      : cal
                  ),
                }
              : a
          ),
        })),

      setSyncing: (isSyncing) => set({ isSyncing }),
      setError: (error) => set({ error }),

      getAccount: (accountId) => get().accounts.find((a) => a.id === accountId),

      getAllSelectedCalendars: () => {
        const result: { accountId: string; calendar: GoogleCalendar }[] = [];
        for (const account of get().accounts) {
          for (const calendar of account.calendars) {
            if (calendar.selected) {
              result.push({ accountId: account.id, calendar });
            }
          }
        }
        return result;
      },

      isConnected: () => get().accounts.length > 0,

      reset: () =>
        set({
          accounts: [],
          isSyncing: false,
          error: null,
        }),
    }),
    {
      name: "google-calendar-storage",
      partialize: (state) => ({
        accounts: state.accounts,
        isAddingAccount: state.isAddingAccount,
      }),
      onRehydrateStorage: () => {
        console.log("[GoogleCalendarStore] Rehydration starting...");
        return (state) => {
          console.log("[GoogleCalendarStore] Rehydration complete, accounts:", state?.accounts?.length ?? 0);
          resolveRehydration();
        };
      },
    }
  )
);

// Re-export GoogleCalendar type for backwards compatibility
export type { GoogleCalendar, GoogleAccount } from "@/types";
