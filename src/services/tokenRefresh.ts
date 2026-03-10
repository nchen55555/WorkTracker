import { supabase, isSupabaseConfigured } from "./supabase";
import { useGoogleCalendarStore, waitForStoreRehydration } from "@/stores/googleCalendarStore";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email";
const OAUTH_STATE_KEY = "google_oauth_adding_account";
const OAUTH_REAUTH_KEY = "google_oauth_reauth";

/**
 * Check if an error indicates the Google token has expired or is invalid.
 */
export function isGoogleAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("google_token_expired") ||
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("insufficient") ||
      msg.includes("scope") ||
      msg.includes("permission") ||
      msg.includes("expired") ||
      msg.includes("invalid_token")
    );
  }
  return false;
}

/**
 * Validate a Google access token by making a lightweight API call.
 * Returns true if valid, false if expired/invalid.
 */
export async function validateGoogleToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + encodeURIComponent(accessToken)
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check all Google accounts and redirect to login if any token is expired.
 * Call this on app startup.
 */
export async function checkAndRefreshGoogleTokens(): Promise<void> {
  const store = useGoogleCalendarStore.getState();
  const accounts = store.accounts;

  if (accounts.length === 0) {
    return; // No accounts to check
  }

  console.log("[TokenRefresh] Checking Google tokens on startup...");

  for (const account of accounts) {
    if (!account.accessToken) continue;

    const isValid = await validateGoogleToken(account.accessToken);

    if (!isValid) {
      console.log(`[TokenRefresh] Token expired for ${account.email}, attempting refresh...`);

      // Try to refresh the token
      const refreshed = await refreshGoogleTokenForAccount(account.id);

      if (!refreshed) {
        console.log(`[TokenRefresh] Refresh failed for ${account.email}, redirecting to Google login...`);
        await redirectToGoogleLogin();
        return; // Stop checking, we're redirecting
      }

      console.log(`[TokenRefresh] Token refreshed for ${account.email}`);
    } else {
      console.log(`[TokenRefresh] Token valid for ${account.email}`);
    }
  }
}

/**
 * Redirect to Google login to re-authenticate.
 * Uses Supabase's OAuth flow which has redirect URIs already configured.
 */
export async function redirectToGoogleLogin(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.error("Supabase not configured");
    return;
  }

  // Clear the store before re-auth
  useGoogleCalendarStore.getState().reset();

  console.log("[OAuth] Redirecting to Google for re-authentication via Supabase...");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      scopes: GOOGLE_SCOPES,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("[OAuth] Failed to redirect:", error);
  }
}

/**
 * Check if we're returning from a re-auth OAuth redirect.
 */
export function isOAuthReauthCallback(): boolean {
  return localStorage.getItem(OAUTH_REAUTH_KEY) !== null;
}

/**
 * Clear the re-auth flag after processing.
 */
export function clearReauthFlag(): void {
  localStorage.removeItem(OAUTH_REAUTH_KEY);
}

/**
 * Attempts to refresh the Google OAuth token for a specific account.
 */
export async function refreshGoogleTokenForAccount(accountId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn("[TokenRefresh] Supabase not configured, cannot refresh token");
    return false;
  }

  const store = useGoogleCalendarStore.getState();
  const account = store.getAccount(accountId);

  if (!account) {
    console.warn(`[TokenRefresh] Account ${accountId} not found`);
    return false;
  }

  const { refreshToken } = account;

  console.log(`[TokenRefresh] Attempting token refresh for ${account.email}...`);
  console.log("[TokenRefresh] Has refresh token:", !!refreshToken);

  if (!refreshToken) {
    console.warn("[TokenRefresh] No refresh token available - user needs to sign out and sign in again");
    return false;
  }

  try {
    console.log("[TokenRefresh] Trying direct Google API refresh...");
    const newToken = await refreshWithGoogle(refreshToken);
    if (newToken) {
      console.log("[TokenRefresh] Successfully refreshed via Google API");
      store.updateAccountTokens(accountId, newToken, refreshToken);
      return true;
    }
    console.log("[TokenRefresh] Google API refresh failed");

    // Token refresh didn't work - user needs to re-authenticate this account
    console.warn("[TokenRefresh] Could not refresh token - re-authentication required");
    return false;
  } catch (error) {
    console.error("[TokenRefresh] Error during token refresh:", error);
    return false;
  }
}

/**
 * Legacy function for backwards compatibility - refreshes the first account's token
 * @deprecated Use refreshGoogleTokenForAccount instead
 */
export async function refreshGoogleToken(): Promise<boolean> {
  const store = useGoogleCalendarStore.getState();
  const firstAccount = store.accounts[0];

  if (!firstAccount) {
    console.warn("[TokenRefresh] No accounts found");
    return false;
  }

  return refreshGoogleTokenForAccount(firstAccount.id);
}

/**
 * Attempts to refresh the token directly with Google's OAuth endpoint.
 * This requires the Google client ID from environment variables.
 */
async function refreshWithGoogle(refreshToken: string): Promise<string | null> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.warn("VITE_GOOGLE_CLIENT_ID not set, cannot refresh via Google API");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Google token refresh failed:", error);
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error("Error calling Google token endpoint:", error);
    return null;
  }
}

/**
 * Fetches the user's email from Google using an access token.
 */
async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
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

// Store OAuth params when detected so we don't lose them
let cachedOAuthParams: { accessToken: string; state: string } | null = null;

/**
 * Checks if we're returning from an OAuth redirect for adding an account.
 * This is specifically for our direct Google OAuth flow (not Supabase OAuth).
 */
export function isOAuthAddAccountCallback(): boolean {
  const savedState = localStorage.getItem(OAUTH_STATE_KEY);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get("access_token");
  const returnedState = hashParams.get("state");

  // Only return true if:
  // 1. We have our saved state in localStorage
  // 2. There's an access_token in the hash
  // 3. The returned state matches our saved state (not a Supabase callback)
  if (savedState && accessToken && returnedState === savedState) {
    // Cache the params immediately so we don't lose them
    cachedOAuthParams = { accessToken, state: returnedState };
    console.log("[OAuth] Add account callback detected, caching params");
    return true;
  }

  // Clean up stale state if the states don't match
  if (savedState && accessToken && returnedState !== savedState) {
    console.log("[OAuth] Clearing stale OAuth state (Supabase callback detected)");
    localStorage.removeItem(OAUTH_STATE_KEY);
  }

  return false;
}

/**
 * Process the OAuth callback when returning from Google.
 * Call this on app startup if isOAuthAddAccountCallback() returns true.
 */
export async function processOAuthAddAccountCallback(): Promise<{ success: boolean; error?: string }> {
  // Use cached params from isOAuthAddAccountCallback() to avoid race conditions
  // where localStorage or hash gets cleared between the check and processing
  let accessToken: string | null = null;
  let returnedState: string | null = null;

  if (cachedOAuthParams) {
    accessToken = cachedOAuthParams.accessToken;
    returnedState = cachedOAuthParams.state;
    cachedOAuthParams = null; // Clear cache after use
    console.log("[OAuth] Using cached OAuth params");
  } else {
    // Fallback to reading from URL/localStorage
    const savedState = localStorage.getItem(OAUTH_STATE_KEY);
    if (!savedState) {
      return { success: false, error: "No OAuth state found" };
    }

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get("access_token");
    returnedState = params.get("state");

    if (returnedState !== savedState) {
      return { success: false, error: "OAuth state mismatch" };
    }
  }

  // Clear the state from localStorage
  localStorage.removeItem(OAUTH_STATE_KEY);

  // Clear the hash from URL
  window.history.replaceState(null, "", window.location.pathname);

  // Check for error in hash
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const error = hashParams.get("error");
  if (error) {
    return { success: false, error };
  }

  if (!accessToken) {
    return { success: false, error: "No access token received" };
  }

  try {
    const email = await fetchGoogleEmail(accessToken);
    if (!email) {
      return { success: false, error: "Could not fetch Google account email" };
    }

    // CRITICAL: Wait for store to rehydrate from localStorage before modifying
    // This prevents race conditions where existing accounts get overwritten
    console.log("[OAuth] Waiting for store rehydration before adding account...");
    await waitForStoreRehydration();
    console.log("[OAuth] Store rehydrated");

    const store = useGoogleCalendarStore.getState();
    console.log("[OAuth] Current accounts in store:", store.accounts.length, store.accounts.map(a => a.email));

    const existingAccount = store.accounts.find((a) => a.email === email);

    if (existingAccount) {
      store.updateAccountTokens(existingAccount.id, accessToken, null);
      console.log(`[OAuth] Updated tokens for existing account: ${email}`);
    } else {
      store.addAccount({
        id: crypto.randomUUID(),
        email,
        accessToken,
        refreshToken: null,
        calendars: [],
        lastSyncAt: null,
      });
      console.log(`[OAuth] Added new Google account: ${email}`);
      console.log("[OAuth] Accounts after add:", useGoogleCalendarStore.getState().accounts.length);
    }

    // Clear the adding account flag
    store.setIsAddingAccount(false);

    return { success: true };
  } catch (err) {
    // Clear the flag even on error
    useGoogleCalendarStore.getState().setIsAddingAccount(false);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Initiates Google OAuth to add a new calendar account.
 * Uses a redirect flow (not popup) for better compatibility with Tauri.
 */
export function addGoogleAccount(): void {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in your environment.");
  }

  // Set flag to prevent store reset during account addition
  useGoogleCalendarStore.getState().setIsAddingAccount(true);

  // Generate and save state for CSRF protection
  const state = crypto.randomUUID();
  localStorage.setItem(OAUTH_STATE_KEY, state);

  // Build the OAuth URL - redirect back to app root
  const redirectUri = window.location.origin + "/";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account"); // Let user pick which account
  authUrl.searchParams.set("include_granted_scopes", "true");

  console.log("[OAuth] Redirecting to Google for account addition...");
  console.log("[OAuth] Current accounts:", useGoogleCalendarStore.getState().accounts.length);
  console.log("[OAuth] Redirect URI:", redirectUri);

  // Full page redirect
  window.location.href = authUrl.toString();
}

/**
 * @deprecated Use addGoogleAccount instead
 */
export async function reAuthenticateWithGoogle(): Promise<void> {
  return addGoogleAccount();
}
