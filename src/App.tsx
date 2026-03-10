import { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthPage } from "./components/auth/AuthPage";
// import { DebugPanel } from "./components/debug/DebugPanel";
import { useAuthInit } from "./hooks/useAuth";
import { useAuthStore } from "./stores/authStore";
import { isSupabaseConfigured } from "./services/supabase";
import {
  isOAuthAddAccountCallback,
  processOAuthAddAccountCallback,
  checkAndRefreshGoogleTokens,
} from "./services/tokenRefresh";

// Check if this is an OAuth callback before rendering main app
const isOAuthCallback = window.location.pathname === "/oauth/callback";
// Check if returning from redirect-based OAuth for adding account
const isAddAccountCallback = isOAuthAddAccountCallback();

// Handle OAuth callback for popup-based Google auth
function OAuthCallback() {
  useEffect(() => {
    // Parse the hash fragment for token (implicit grant flow)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const error = params.get("error");
    const state = params.get("state");

    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "GOOGLE_OAUTH_CALLBACK",
          accessToken,
          error,
          state,
        },
        window.location.origin,
      );
      // Close the popup
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#FFDE59] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Completing sign in...</p>
      </div>
    </div>
  );
}

// Handle redirect-based OAuth callback for adding Google account
function AddAccountCallbackHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processOAuthAddAccountCallback()
      .then((result) => {
        if (!result.success && result.error) {
          console.error("[OAuth] Add account callback failed:", result.error);
          setError(result.error);
        } else {
          console.log("[OAuth] Successfully added Google account");
        }
      })
      .catch((err) => {
        console.error("[OAuth] Error processing callback:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        setIsProcessing(false);
      });
  }, []);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FFDE59] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Adding Google account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8V12M12 16H12.01"
                stroke="#EF4444"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-text-primary font-medium mb-2">
            Failed to add account
          </p>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#FFDE59] text-[#5C4A1F] rounded-lg font-medium hover:bg-[#FFD633] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function MainApp() {
  // Initialize auth listener
  useAuthInit();

  const { user, isLoading, isInitialized } = useAuthStore();
  const [isCheckingTokens, setIsCheckingTokens] = useState(true);

  // Check Google tokens on startup
  useEffect(() => {
    if (isInitialized && !isLoading && user) {
      // Small delay to let stores settle after initialization
      const timer = setTimeout(() => {
        checkAndRefreshGoogleTokens()
          .catch((err) =>
            console.error("[App] Error checking Google tokens:", err),
          )
          .finally(() => setIsCheckingTokens(false));
      }, 500);
      return () => clearTimeout(timer);
    } else if (isInitialized && !isLoading) {
      // No user logged in, skip token check
      setIsCheckingTokens(false);
    }
  }, [isInitialized, isLoading, user]);

  // Show loading state while checking auth or tokens
  if (!isInitialized || isLoading || (user && isCheckingTokens)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#FFDE59] border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // If Supabase is configured but user is not logged in, show auth page
  if (isSupabaseConfigured() && !user) {
    return <AuthPage />;
  }

  // Show main app (works with or without Supabase)
  return (
    <>
      <AppLayout />
      {/*<DebugPanel />*/}
    </>
  );
}

function App() {
  // If this is an OAuth callback (popup flow), handle it separately
  if (isOAuthCallback) {
    return <OAuthCallback />;
  }

  // If returning from redirect-based OAuth for adding account, process it first
  if (isAddAccountCallback) {
    return (
      <AddAccountCallbackHandler>
        <MainApp />
      </AddAccountCallbackHandler>
    );
  }

  return <MainApp />;
}

export default App;
