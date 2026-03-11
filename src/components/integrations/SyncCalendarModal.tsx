import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { useGoogleCalendarStore } from "@/stores/googleCalendarStore";
import { fetchGoogleCalendarList } from "@/services/googleCalendar";
import { useGoogleCalendarSync } from "@/hooks/useGoogleCalendarSync";
import { addGoogleAccount, isGoogleAuthError, redirectToGoogleLogin } from "@/services/tokenRefresh";
import { supabase } from "@/services/supabase";
import type { GoogleAccount } from "@/types";

interface SyncCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncCalendarModal({ isOpen, onClose }: SyncCalendarModalProps) {
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isReconnecting, setIsReconnecting] = useState(false);

  const {
    accounts,
    setAccountCalendars,
    toggleCalendarSelection,
    renameCalendar,
    setFreeBusyTitle,
    removeAccount,
    reset,
  } = useGoogleCalendarStore();

  const sync = useGoogleCalendarSync();

  const isConnected = accounts.length > 0;

  // Check if error is a permission/auth error that requires reconnection
  const isAuthError = error && (
    error.toLowerCase().includes("insufficient") ||
    error.toLowerCase().includes("scope") ||
    error.toLowerCase().includes("permission") ||
    error.toLowerCase().includes("403") ||
    error.toLowerCase().includes("401") ||
    error.toLowerCase().includes("expired") ||
    error.toLowerCase().includes("token")
  );

  const handleReconnect = async () => {
    if (!supabase) {
      setError("Supabase not configured");
      return;
    }

    setIsReconnecting(true);
    setError(null);

    try {
      // Clear the existing Google Calendar data
      reset();

      // Sign out first to clear the cached session
      await supabase.auth.signOut();

      // Close the modal
      onClose();

      // Small delay then trigger fresh OAuth
      await new Promise(resolve => setTimeout(resolve, 100));

      // Direct OAuth call with full calendar access
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        setError(error.message);
        setIsReconnecting(false);
      }
    } catch (err) {
      console.error("Reconnect failed:", err);
      setError(err instanceof Error ? err.message : "Failed to reconnect");
      setIsReconnecting(false);
    }
  };

  // Fetch calendars when modal opens
  useEffect(() => {
    if (isOpen && isConnected) {
      console.log("[SyncModal] Modal opened, loading calendars for", accounts.length, "accounts");
      loadAllAccountCalendars();
    }
  }, [isOpen]);

  // Reset editing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingCalendarId(null);
      setEditingAccountId(null);
      setEditingName("");
    }
  }, [isOpen]);

  const loadAllAccountCalendars = async () => {
    for (const account of accounts) {
      await loadCalendarsForAccount(account);
    }
  };

  const loadCalendarsForAccount = async (account: GoogleAccount) => {
    console.log("[SyncModal] Loading calendars for account:", account.email);
    console.log("[SyncModal] Account has token:", !!account.accessToken, "length:", account.accessToken?.length);
    setLoadingAccountId(account.id);
    setError(null);

    try {
      const calendarList = await fetchGoogleCalendarList(account.accessToken);

      // Preserve selection state and custom names from previously loaded calendars
      const previousCalendars = new Map(
        account.calendars.map((c) => [c.id, { selected: c.selected, displayName: c.displayName, freeBusyTitle: c.freeBusyTitle }])
      );

      const mergedList = calendarList.map((cal) => {
        const previous = previousCalendars.get(cal.id);
        return {
          ...cal,
          selected: previous?.selected ?? cal.selected,
          displayName: previous?.displayName,
          freeBusyTitle: previous?.freeBusyTitle,
        };
      });

      setAccountCalendars(account.id, mergedList);
    } catch (err) {
      // If it's an auth error (expired token, insufficient permissions), auto-redirect to login
      if (isGoogleAuthError(err)) {
        console.log("[SyncModal] Auth error detected, redirecting to Google login...");
        onClose();
        await redirectToGoogleLogin();
        return;
      }
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to fetch calendars for ${account.email}: ${errorMessage}`);
    } finally {
      setLoadingAccountId(null);
    }
  };

  const handleAddAccount = () => {
    try {
      // This will redirect to Google OAuth
      // When user returns, App.tsx will process the callback and add the account
      addGoogleAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth flow");
    }
  };

  const handleRemoveAccount = (accountId: string) => {
    removeAccount(accountId);
  };

  const handleSync = async () => {
    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    try {
      await sync.mutateAsync({
        timeMin: now.toISOString().split("T")[0],
        timeMax: twoWeeksOut.toISOString().split("T")[0],
      });
      onClose();
    } catch (err) {
      // If it's an auth error, auto-redirect to login
      if (isGoogleAuthError(err)) {
        console.log("[SyncModal] Auth error during sync, redirecting to Google login...");
        onClose();
        await redirectToGoogleLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to sync calendars");
    }
  };

  const startEditing = (accountId: string, calendarId: string, currentName: string) => {
    setEditingAccountId(accountId);
    setEditingCalendarId(calendarId);
    setEditingName(currentName);
  };

  const saveRename = () => {
    if (editingAccountId && editingCalendarId) {
      renameCalendar(editingAccountId, editingCalendarId, editingName);
      setEditingAccountId(null);
      setEditingCalendarId(null);
      setEditingName("");
    }
  };

  const cancelEditing = () => {
    setEditingAccountId(null);
    setEditingCalendarId(null);
    setEditingName("");
  };

  if (!isOpen) return null;

  const totalSelectedCount = accounts.reduce(
    (sum, acc) => sum + acc.calendars.filter((c) => c.selected).length,
    0
  );
  const isSyncing = sync.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[480px] mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          {/* Calendar Icon */}
          <div className="flex items-center justify-center w-16 h-16 bg-[#FFF8E1] rounded-2xl mb-5">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="6" width="24" height="22" rx="3" stroke="#C4A44E" strokeWidth="2" fill="none" />
              <path d="M4 12H28" stroke="#C4A44E" strokeWidth="2" />
              <path d="M10 4V8" stroke="#C4A44E" strokeWidth="2" strokeLinecap="round" />
              <path d="M22 4V8" stroke="#C4A44E" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-text-primary font-serif">
            Sync Google Calendar
          </h2>
          <p className="text-sm text-text-muted mt-1 text-center">
            Select which calendars to sync from your Google accounts
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-4 flex-1 overflow-y-auto">
          {!isConnected ? (
            // Not connected - show add account button
            <div className="text-center py-6">
              <p className="text-sm text-text-muted mb-4">
                Connect your Google account to sync calendars.
              </p>
              <button
                onClick={handleAddAccount}
                className="px-4 py-2 bg-[#FFDE59] text-[#5C4A1F] rounded-lg font-medium hover:bg-[#FFD633] transition-colors"
              >
                Connect Google Account
              </button>
            </div>
          ) : (
            // Account list with calendars
            <div className="space-y-6">
              {accounts.map((account) => (
                <div key={account.id} className="border border-border-subtle rounded-xl overflow-hidden">
                  {/* Account Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-[#FAFAF8]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#FFDE59] flex items-center justify-center text-sm font-medium text-[#5C4A1F]">
                        {account.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">
                          {account.email}
                        </p>
                        <p className="text-xs text-text-muted">
                          {account.calendars.filter((c) => c.selected).length} calendars selected
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAccount(account.id)}
                      className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remove account"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  {/* Calendars */}
                  <div className="p-2">
                    {loadingAccountId === account.id ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 border-[#FFDE59] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : account.calendars.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-text-muted">No calendars found</p>
                        <button
                          onClick={() => loadCalendarsForAccount(account)}
                          className="text-sm text-[#5C4A1F] hover:underline mt-1"
                        >
                          Refresh
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {account.calendars.map((calendar) => {
                          const isEditing = editingAccountId === account.id && editingCalendarId === calendar.id;
                          const displayName = calendar.displayName || calendar.name;

                          const isFreeBusy = calendar.accessRole === "freeBusyReader";

                          return (
                            <div
                              key={calendar.id}
                              className={cn(
                                "flex flex-col gap-1 px-3 py-2 rounded-lg transition-colors",
                                calendar.selected
                                  ? "bg-[#FFFDF7]"
                                  : "hover:bg-background-hover"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleCalendarSelection(account.id, calendar.id)}
                                  className={cn(
                                    "w-4 h-4 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0",
                                    calendar.selected
                                      ? "bg-[#FFDE59] border-[#FFDE59]"
                                      : "border-gray-300 bg-white"
                                  )}
                                >
                                  {calendar.selected && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                      <path
                                        d="M1 4L3.5 6.5L9 1"
                                        stroke="#5C4A1F"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                </button>

                                {/* Color Dot */}
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: calendar.color }}
                                />

                                {/* Calendar Name */}
                                {isEditing ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveRename();
                                        if (e.key === "Escape") cancelEditing();
                                      }}
                                      autoFocus
                                      className="flex-1 px-2 py-1 text-sm border border-[#FFDE59] rounded focus:outline-none focus:ring-1 focus:ring-[#FFDE59]"
                                    />
                                    <button
                                      onClick={saveRename}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M2 7L5 10L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M3 3L11 11M3 11L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1 min-w-0">
                                      <span
                                        className="text-sm text-text-primary truncate cursor-pointer block"
                                        onClick={() => toggleCalendarSelection(account.id, calendar.id)}
                                      >
                                        {displayName}
                                      </span>
                                      {isFreeBusy && (
                                        <span className="text-xs text-text-muted">Free/busy only</span>
                                      )}
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(account.id, calendar.id, displayName);
                                      }}
                                      className="p-1 text-text-muted hover:text-text-primary hover:bg-background-hover rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                      title="Rename"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path
                                          d="M9 1L11 3L4 10L1 11L2 8L9 1Z"
                                          stroke="currentColor"
                                          strokeWidth="1.25"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Free/busy event title input */}
                              {isFreeBusy && calendar.selected && (
                                <div className="ml-[2.125rem] mt-1">
                                  <input
                                    type="text"
                                    value={calendar.freeBusyTitle || ""}
                                    onChange={(e) => setFreeBusyTitle(account.id, calendar.id, e.target.value)}
                                    placeholder="Event title (default: Busy)"
                                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#FFDE59] focus:border-[#FFDE59] placeholder:text-gray-400"
                                  />
                                  <p className="text-[10px] text-text-muted mt-0.5">
                                    Title used for events from this calendar
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Another Account */}
              <button
                onClick={handleAddAccount}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl text-sm transition-colors border-gray-200 text-text-muted hover:border-[#FFDE59] hover:text-[#5C4A1F]"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add Another Account
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-red-600">{error}</p>
                  {isAuthError && (
                    <div className="text-xs text-red-500 mt-2 space-y-1">
                      <p>To fix this, you need to revoke access and reconnect:</p>
                      <ol className="list-decimal ml-4 space-y-0.5">
                        <li>
                          Go to{" "}
                          <a
                            href="https://myaccount.google.com/permissions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-red-700"
                          >
                            Google Account Permissions
                          </a>
                        </li>
                        <li>Find and remove this app's access</li>
                        <li>Click "Reconnect" below</li>
                      </ol>
                    </div>
                  )}
                </div>
                {isAuthError && (
                  <button
                    onClick={handleReconnect}
                    disabled={isReconnecting}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap self-end",
                      isReconnecting
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-red-600 text-white hover:bg-red-700"
                    )}
                  >
                    {isReconnecting ? "Reconnecting..." : "Reconnect"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 space-y-3 border-t border-border-subtle">
          {isConnected && (
            <button
              onClick={handleSync}
              disabled={isSyncing || totalSelectedCount === 0}
              className={cn(
                "w-full py-3 rounded-xl font-medium transition-colors",
                isSyncing || totalSelectedCount === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#FFDE59] text-[#5C4A1F] hover:bg-[#FFD633]"
              )}
            >
              {isSyncing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#5C4A1F] border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </span>
              ) : (
                `Sync ${totalSelectedCount} Calendar${totalSelectedCount !== 1 ? "s" : ""}`
              )}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isSyncing}
            className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
