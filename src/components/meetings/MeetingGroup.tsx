import { useState } from "react";
import { MeetingRow } from "./MeetingRow";
import { useUpdateCategory } from "@/hooks/useCategories";
import type { Meeting } from "@/types";

interface MeetingGroupProps {
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  meetings: Meeting[];
  isCollapsed?: boolean;
  onToggle?: () => void;
  onMeetingClick?: (meeting: Meeting) => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function MeetingGroup({
  calendarId,
  calendarName,
  calendarColor,
  meetings,
  isCollapsed = false,
  onToggle,
  onMeetingClick,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}: MeetingGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(calendarName);
  const updateCategory = useUpdateCategory();

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't allow editing "uncategorized" or "Other"
    if (calendarId === "uncategorized") return;
    setEditingName(calendarName);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editingName.trim() && editingName.trim() !== calendarName) {
      updateCategory.mutate({
        id: calendarId,
        type: "meeting",
        updates: { name: editingName.trim() },
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditingName(calendarName);
      setIsEditing(false);
    }
  };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 mb-2 w-full">
        <button onClick={onToggle} className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-[3px]"
            style={{ backgroundColor: calendarColor }}
          />
        </button>

        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-sm font-medium uppercase tracking-wide text-[#8B7355] bg-transparent border-b border-[#8B7355] outline-none px-0 py-0"
          />
        ) : (
          <span
            onClick={handleStartEditing}
            className={`text-sm font-medium uppercase tracking-wide text-[#8B7355] transition-colors ${
              calendarId !== "uncategorized" ? "cursor-pointer hover:text-[#6B5335]" : ""
            }`}
          >
            {calendarName}
          </span>
        )}

        <button onClick={onToggle}>
          <span className="text-sm text-text-muted">{meetings.length}</span>
        </button>
      </div>

      {/* Meetings */}
      {!isCollapsed && (
        <div className="flex flex-col gap-2">
          {meetings.map((meeting) => (
            <MeetingRow
              key={meeting.id}
              meeting={meeting}
              onClick={() => onMeetingClick?.(meeting)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(meeting.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
