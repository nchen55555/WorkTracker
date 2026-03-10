import { cn } from "@/utils/cn";
import { formatDayDateTime, formatTimeSimple } from "@/utils/dates";
import { useUpdateMeeting, useArchiveMeeting, useDeleteMeeting } from "@/hooks/useMeetings";
import type { Meeting } from "@/types";

interface MeetingRowProps {
  meeting: Meeting;
  onClick?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function MeetingRow({
  meeting,
  onClick,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: MeetingRowProps) {
  const updateMeeting = useUpdateMeeting();
  const archiveMeeting = useArchiveMeeting();
  const deleteMeeting = useDeleteMeeting();

  // Format as "Mon 14:00 • Product Team" or "Mon – Fri 10:00"
  const getDateTimeDisplay = () => {
    const dayName = formatDayDateTime(meeting.scheduledDate);
    const time = formatTimeSimple(meeting.startTime);
    return `${dayName} ${time}`;
  };

  const dateTimeText = getDateTimeDisplay();

  // Format attendees for display
  const attendeesText = meeting.attendees?.length
    ? meeting.attendees.slice(0, 3).join(", ") + (meeting.attendees.length > 3 ? "..." : "")
    : null;

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect?.(meeting.id);
    } else {
      onClick?.();
    }
  };

  const handleSelectionCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(meeting.id);
  };

  const handleCompletionCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelectionMode) {
      updateMeeting.mutate({
        id: meeting.id,
        updates: { isCompleted: !meeting.isCompleted },
        originalMeeting: meeting,
      });
    }
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    archiveMeeting.mutate({ id: meeting.id, isArchived: true });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMeeting.mutate({ id: meeting.id, meeting });
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 bg-background-card border border-border-subtle rounded-[10px]",
        "cursor-pointer hover:bg-background-hover hover:border-[#E8E0D0] transition-colors",
        meeting.isCompleted && "opacity-60",
        isSelected && "bg-[#DBEAFE] border-[#3B82F6]"
      )}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <button
          onClick={handleSelectionCheckboxClick}
          className={cn(
            "w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors border-2",
            isSelected
              ? "bg-[#3B82F6] border-[#3B82F6]"
              : "bg-white border-[#E8E0D0] hover:border-[#3B82F6]"
          )}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-lg font-medium truncate",
          meeting.isCompleted
            ? "text-text-muted line-through"
            : "text-text-primary"
        )}>
          {meeting.title}
        </div>
        <div className={cn(
          "text-sm",
          meeting.isCompleted ? "text-text-muted" : "text-text-secondary"
        )}>
          {dateTimeText}
          {attendeesText && <span> • {attendeesText}</span>}
        </div>
      </div>

      {/* Actions - only show outside selection mode */}
      {!isSelectionMode && (
        <div className="flex items-center gap-1">
          {/* Delete Button - show on hover */}
          <button
            onClick={handleDeleteClick}
            className="p-1.5 rounded opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
            title="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>

          {/* Archive Button - show on hover */}
          <button
            onClick={handleArchiveClick}
            className="p-1.5 rounded opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary hover:bg-[#F5F5F0] transition-all"
            title="Archive"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </button>

          {/* Completion Checkbox */}
          <button
            onClick={handleCompletionCheckboxClick}
            className={cn(
              "w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors border-2",
              meeting.isCompleted
                ? "bg-[#FFDE59] border-[#FFDE59]"
                : "bg-white border-[#E8E0D0] hover:border-[#FFDE59]"
            )}
          >
            {meeting.isCompleted && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A4A42" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
