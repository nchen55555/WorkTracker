import { useState } from "react";
import { cn } from "@/utils/cn";
import {
  useCalendarStore,
  type CalendarViewMode,
} from "@/stores/calendarStore";
import { formatMonthYear } from "@/utils/dates";
import { UserMenu } from "@/components/layout/UserMenu";

const viewOptions: { value: CalendarViewMode; label: string }[] = [
  { value: "3days", label: "3 Days" },
  { value: "5days", label: "5 Days" },
  { value: "week", label: "Week" },
];

export function CalendarHeader() {
  const { currentDate, navigateWeek, goToToday, viewMode, setViewMode } =
    useCalendarStore();
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  const currentViewLabel =
    viewOptions.find((v) => v.value === viewMode)?.label || "Week";

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-text-primary font-serif">
          {formatMonthYear(currentDate)}
        </h2>
        <button
          onClick={goToToday}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-lg",
            "border border-border-subtle bg-white",
            "text-text-secondary hover:bg-background-hover hover:text-text-primary transition-colors",
          )}
        >
          Today
        </button>

        {/* View Mode Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowViewDropdown(!showViewDropdown)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg",
              "hover:bg-[#BFDBFE] transition-colors",
            )}
          >
            {currentViewLabel}
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              className={cn(
                "transition-transform",
                showViewDropdown && "rotate-180",
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

          {showViewDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowViewDropdown(false)}
              />
              <div className="absolute top-full right-0 mt-1 bg-white border border-border-subtle rounded-lg shadow-lg z-20 py-1 min-w-[100px]">
                {viewOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setViewMode(option.value);
                      setShowViewDropdown(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left transition-colors",
                      option.value === viewMode
                        ? "font-medium"
                        : "text-text-primary hover:bg-background-hover",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <UserMenu />
        <button
          onClick={() => navigateWeek("prev")}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg",
            "border border-border-subtle bg-white",
            "hover:bg-background-hover transition-colors",
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-text-secondary"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          onClick={() => navigateWeek("next")}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg",
            "border border-border-subtle bg-white",
            "hover:bg-background-hover transition-colors",
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-text-secondary"
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
