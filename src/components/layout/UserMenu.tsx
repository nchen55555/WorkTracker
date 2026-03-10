import { useState } from "react";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/stores/authStore";
import { useSignOut } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/services/supabase";

export function UserMenu() {
  const { user, getDisplayName, getInitials } = useAuthStore();
  const signOut = useSignOut();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if Supabase is not configured or no user
  if (!isSupabaseConfigured() || !user) {
    return null;
  }

  const displayName = getDisplayName();
  const initials = getInitials();

  const handleSignOut = async () => {
    await signOut.mutateAsync();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
          "hover:bg-background-hover",
          isOpen && "bg-background-hover"
        )}
      >
        <div className="w-7 h-7 rounded-full bg-[#FFDE59] flex items-center justify-center">
          <span className="text-xs font-semibold text-[#5C4A1F]">{initials}</span>
        </div>
        <span className="text-sm text-text-secondary truncate max-w-[150px]">
          {displayName}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={cn(
            "text-text-muted transition-transform",
            isOpen && "rotate-180"
          )}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-56 bg-white border border-border-subtle rounded-lg shadow-lg z-20 py-1">
            <div className="px-3 py-2 border-b border-border-subtle">
              <p className="text-sm font-medium text-text-primary truncate">
                {displayName}
              </p>
              <p className="text-xs text-text-muted truncate">
                {user.email}
              </p>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signOut.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.6667 11.3333L14 8L10.6667 4.66667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 8H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {signOut.isPending ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
