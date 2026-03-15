import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useGoogleCalendarStore, waitForStoreRehydration } from "@/stores/googleCalendarStore";

async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.email || null;
  } catch {
    return null;
  }
}

export function useAuthInit() {
  const { setUser, setLoading, setInitialized } = useAuthStore();

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      // No Supabase, skip auth
      setLoading(false);
      setInitialized(true);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("[Auth] Initial session check");
      console.log("[Auth] Has session:", !!session);
      console.log("[Auth] Has provider_token:", !!session?.provider_token);
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        console.log("[Auth] Processing provider_token from initial session");
        await handleGoogleTokenReceived(
          session.provider_token,
          session.provider_refresh_token ?? null
        );
      }
      setLoading(false);
      setInitialized(true);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] State change:", event, "Has provider_token:", !!session?.provider_token);
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.provider_token) {
        console.log("[Auth] SIGNED_IN with provider_token, calling handleGoogleTokenReceived");
        await handleGoogleTokenReceived(
          session.provider_token,
          session.provider_refresh_token ?? null
        );
      }
      if (event === "TOKEN_REFRESHED" && session?.provider_token) {
        // Update existing account tokens when Supabase refreshes them
        const store = useGoogleCalendarStore.getState();
        const email = await fetchGoogleUserEmail(session.provider_token);
        if (email) {
          const existingAccount = store.accounts.find((a) => a.email === email);
          if (existingAccount) {
            store.updateAccountTokens(
              existingAccount.id,
              session.provider_token,
              session.provider_refresh_token ?? null
            );
          }
        }
      }
      // NOTE: We intentionally do NOT reset the calendar store on SIGNED_OUT
      // because adding another Google account triggers SIGNED_OUT first.
      // The reset is handled explicitly in useSignOut instead.
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, setInitialized]);
}

async function handleGoogleTokenReceived(
  accessToken: string,
  refreshToken: string | null
) {
  console.log("[Auth] handleGoogleTokenReceived called");
  console.log("[Auth] Access token length:", accessToken?.length);
  console.log("[Auth] Has refresh token:", !!refreshToken);

  // Wait for store to rehydrate from localStorage before modifying
  // This prevents race conditions where new account data gets overwritten
  console.log("[Auth] Waiting for store rehydration...");
  await waitForStoreRehydration();
  console.log("[Auth] Store rehydrated");

  const store = useGoogleCalendarStore.getState();
  console.log("[Auth] Current accounts in store:", store.accounts.length);

  // Fetch email to identify the account
  const email = await fetchGoogleUserEmail(accessToken);
  console.log("[Auth] Fetched email:", email);
  if (!email) {
    console.warn("Could not fetch Google user email");
    return;
  }

  // Check if this account already exists
  const existingAccount = store.accounts.find((a) => a.email === email);
  if (existingAccount) {
    // Update tokens for existing account
    store.updateAccountTokens(existingAccount.id, accessToken, refreshToken);
    console.log(`Updated tokens for existing account: ${email}`);
  } else {
    // Add new account
    store.addAccount({
      id: crypto.randomUUID(),
      email,
      accessToken,
      refreshToken,
      calendars: [],
      lastSyncAt: null,
    });
    console.log(`Added new Google account: ${email}`);
  }

  // Clear the adding account flag
  store.setIsAddingAccount(false);
}

export function useSignUp() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
    }: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      if (!supabase) throw new Error("Supabase not configured");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user);
      }
    },
  });
}

export function useSignIn() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      if (!supabase) throw new Error("Supabase not configured");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user);
      }
    },
  });
}

export function useSignOut() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase not configured");

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      setUser(null);
      // Explicitly reset calendar store when user signs out
      useGoogleCalendarStore.getState().reset();
    },
  });
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase not configured");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
          scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
      return data;
    },
  });
}
