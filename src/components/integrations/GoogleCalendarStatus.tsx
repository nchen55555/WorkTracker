import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { useGoogleCalendarStore } from "@/stores/googleCalendarStore";
import { formatDistanceToNow } from "date-fns";
import { SyncCalendarModal } from "./SyncCalendarModal";
import { redirectToGoogleLogin } from "@/services/tokenRefresh";

export function GoogleCalendarStatus() {
  const { accounts, isConnected, isSyncing, error, reset, setError } =
    useGoogleCalendarStore();
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Check if error is a permission/auth error that requires reconnection
  const isAuthError = error && (
    error.includes("insufficient") ||
    error.includes("scope") ||
    error.includes("permission") ||
    error.includes("403") ||
    error.includes("401") ||
    error.includes("expired") ||
    error.includes("GOOGLE_TOKEN_EXPIRED")
  );

  // Auto-redirect to Google login when auth error is detected
  useEffect(() => {
    if (isAuthError) {
      console.log("[GoogleCalendarStatus] Auth error detected, auto-redirecting to Google login...");
      // Small delay to let user see the error briefly
      const timer = setTimeout(async () => {
        reset();
        setError(null);
        await redirectToGoogleLogin();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthError, reset, setError]);

  const handleReconnect = async () => {
    reset();
    setError(null);
    await redirectToGoogleLogin();
  };

  const handleSync = () => {
    // Always show the modal so user can select which calendars to sync
    setShowSyncModal(true);
  };

  // Get the most recent lastSyncAt from all accounts
  const lastSyncAt = accounts.reduce<string | null>((latest, account) => {
    if (!account.lastSyncAt) return latest;
    if (!latest) return account.lastSyncAt;
    return new Date(account.lastSyncAt) > new Date(latest) ? account.lastSyncAt : latest;
  }, null);

  const lastSyncDisplay = lastSyncAt
    ? `Last synced ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: false })} ago`
    : null;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 bg-background-card border border-border-subtle rounded-xl">
        {/* Calendar Icon */}
        <div className="flex items-center justify-center w-10 h-10 bg-[#FFF8E1] rounded-lg">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="4" width="16" height="14" rx="2" stroke="#C4A44E" strokeWidth="1.5" fill="none" />
            <path d="M2 8H18" stroke="#C4A44E" strokeWidth="1.5" />
            <path d="M6 2V5" stroke="#C4A44E" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14 2V5" stroke="#C4A44E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-text-primary">
            Google Calendar
          </div>
          <div className="text-sm text-text-muted">
            {isSyncing
              ? "Syncing..."
              : isConnected()
              ? lastSyncDisplay || "Connected"
              : "Not connected"}
          </div>
        </div>

        {/* Status Badge */}
        {isConnected() && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F5E9] rounded-full">
            {isSyncing ? (
              <div className="w-2 h-2 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            )}
            <span className="text-sm font-medium text-[#2E7D32]">
              Connected
            </span>
          </div>
        )}

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
            isSyncing
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-[#F5F5F0] text-text-primary hover:bg-[#EAEAE5]"
          )}
        >
          {isSyncing ? "Syncing..." : "Sync"}
        </button>
      </div>

      {error && (
        <div className="mt-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm text-red-600">{error}</p>
              {isAuthError && (
                <p className="text-xs text-red-500 mt-1">
                  Redirecting to Google login to refresh your permissions...
                </p>
              )}
            </div>
            {isAuthError && (
              <button
                onClick={handleReconnect}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
              >
                Reconnect Now
              </button>
            )}
          </div>
        </div>
      )}

      <SyncCalendarModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
    </>
  );
}
