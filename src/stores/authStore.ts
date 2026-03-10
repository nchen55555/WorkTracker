import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  // Helper methods for user info
  getFirstName: () => string | null;
  getLastName: () => string | null;
  getDisplayName: () => string;
  getInitials: () => string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),

  getFirstName: () => {
    const user = get().user;
    return user?.user_metadata?.first_name || null;
  },

  getLastName: () => {
    const user = get().user;
    return user?.user_metadata?.last_name || null;
  },

  getDisplayName: () => {
    const user = get().user;
    const meta = user?.user_metadata;

    // Check various name fields (Google uses full_name or name)
    if (meta?.full_name) {
      return meta.full_name;
    }
    if (meta?.name) {
      return meta.name;
    }
    if (meta?.first_name && meta?.last_name) {
      return `${meta.first_name} ${meta.last_name}`;
    }
    if (meta?.first_name) {
      return meta.first_name;
    }
    // Fallback to email
    return user?.email || "User";
  },

  getInitials: () => {
    const user = get().user;
    const meta = user?.user_metadata;

    // Check various name fields
    const fullName = meta?.full_name || meta?.name;
    if (fullName) {
      const parts = fullName.split(" ");
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return fullName.charAt(0).toUpperCase();
    }

    if (meta?.first_name && meta?.last_name) {
      return `${meta.first_name.charAt(0)}${meta.last_name.charAt(0)}`.toUpperCase();
    }
    if (meta?.first_name) {
      return meta.first_name.charAt(0).toUpperCase();
    }
    // Fallback to first letter of email
    return user?.email?.charAt(0).toUpperCase() || "U";
  },
}));
