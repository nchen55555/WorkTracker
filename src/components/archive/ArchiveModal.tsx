import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { useArchivedTasks, useArchiveTask, useDeleteMultipleTasks } from "@/hooks/useTasks";
import { useArchivedNotes, useArchiveNote, useDeleteMultipleNotes } from "@/hooks/useNotes";
import { useArchivedMeetings, useArchiveMeeting, useDeleteMultipleMeetings } from "@/hooks/useMeetings";
import { format, parseISO } from "date-fns";
import { formatTimeSimple } from "@/utils/dates";
import type { Task, Note, Meeting } from "@/types";

// Helper to group items by date
function groupByDate<T extends { scheduledDate?: string }>(
  items: T[]
): { date: string; label: string; items: T[] }[] {
  const groups: Map<string, T[]> = new Map();
  const undated: T[] = [];

  // Sort items by date (most recent first)
  const sorted = [...items].sort((a, b) => {
    if (!a.scheduledDate && !b.scheduledDate) return 0;
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return b.scheduledDate.localeCompare(a.scheduledDate);
  });

  for (const item of sorted) {
    if (item.scheduledDate) {
      const existing = groups.get(item.scheduledDate);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(item.scheduledDate, [item]);
      }
    } else {
      undated.push(item);
    }
  }

  const result: { date: string; label: string; items: T[] }[] = [];

  // Sort dates (most recent first)
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  for (const date of sortedDates) {
    const d = parseISO(date);
    const label = format(d, "EEEE, MMMM d, yyyy");
    result.push({ date, label, items: groups.get(date)! });
  }

  if (undated.length > 0) {
    result.push({ date: "", label: "Undated", items: undated });
  }

  return result;
}

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "tasks" | "meetings" | "notes";

export function ArchiveModal({ isOpen, onClose }: ArchiveModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<Set<string>>(new Set());
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  const { data: archivedTasks = [], isLoading: loadingTasks } = useArchivedTasks();
  const { data: archivedMeetings = [], isLoading: loadingMeetings } = useArchivedMeetings();
  const { data: archivedNotes = [], isLoading: loadingNotes } = useArchivedNotes();

  const archiveTask = useArchiveTask();
  const archiveMeeting = useArchiveMeeting();
  const archiveNote = useArchiveNote();
  const deleteMultipleTasks = useDeleteMultipleTasks();
  const deleteMultipleMeetings = useDeleteMultipleMeetings();
  const deleteMultipleNotes = useDeleteMultipleNotes();

  const handleUnarchiveTask = (taskId: string) => {
    archiveTask.mutate({ id: taskId, isArchived: false });
  };

  const handleUnarchiveMeeting = (meetingId: string) => {
    archiveMeeting.mutate({ id: meetingId, isArchived: false });
  };

  const handleUnarchiveNote = (noteId: string) => {
    archiveNote.mutate({ id: noteId, isArchived: false });
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleMeetingSelection = (meetingId: string) => {
    setSelectedMeetingIds((prev) => {
      const next = new Set(prev);
      if (next.has(meetingId)) {
        next.delete(meetingId);
      } else {
        next.add(meetingId);
      }
      return next;
    });
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const handleDeleteSelectedTasks = () => {
    if (selectedTaskIds.size > 0) {
      deleteMultipleTasks.mutate(Array.from(selectedTaskIds));
      setSelectedTaskIds(new Set());
    }
  };

  const handleDeleteSelectedMeetings = () => {
    if (selectedMeetingIds.size > 0) {
      deleteMultipleMeetings.mutate(Array.from(selectedMeetingIds));
      setSelectedMeetingIds(new Set());
    }
  };

  const handleDeleteSelectedNotes = () => {
    if (selectedNoteIds.size > 0) {
      deleteMultipleNotes.mutate(Array.from(selectedNoteIds));
      setSelectedNoteIds(new Set());
    }
  };

  const handleSelectAllTasks = () => {
    if (selectedTaskIds.size === archivedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(archivedTasks.map((t) => t.id)));
    }
  };

  const handleSelectAllMeetings = () => {
    if (selectedMeetingIds.size === archivedMeetings.length) {
      setSelectedMeetingIds(new Set());
    } else {
      setSelectedMeetingIds(new Set(archivedMeetings.map((m) => m.id)));
    }
  };

  const handleSelectAllNotes = () => {
    if (selectedNoteIds.size === archivedNotes.length) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(archivedNotes.map((n) => n.id)));
    }
  };

  if (!isOpen) return null;

  const isLoading = loadingTasks || loadingMeetings || loadingNotes;
  const taskCount = archivedTasks.length;
  const meetingCount = archivedMeetings.length;
  const noteCount = archivedNotes.length;
  const totalCount = taskCount + meetingCount + noteCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[520px] mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          {/* Archive Icon */}
          <div className="flex items-center justify-center w-16 h-16 bg-[#F5F5F0] rounded-2xl mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B6B5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-text-primary font-serif">
            Archive
          </h2>
          <p className="text-sm text-text-muted mt-1 text-center">
            {totalCount === 0
              ? "No archived items"
              : `${totalCount} archived item${totalCount !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 p-1 bg-[#F5F5F0] rounded-lg">
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "tasks"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            Dailies {taskCount > 0 && `(${taskCount})`}
          </button>
          <button
            onClick={() => setActiveTab("meetings")}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "meetings"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            Meetings {meetingCount > 0 && `(${meetingCount})`}
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "notes"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            Notes {noteCount > 0 && `(${noteCount})`}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#FFDE59] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === "tasks" ? (
            <TaskArchiveList
              tasks={archivedTasks}
              selectedIds={selectedTaskIds}
              onToggleSelect={toggleTaskSelection}
              onUnarchive={handleUnarchiveTask}
            />
          ) : activeTab === "meetings" ? (
            <MeetingArchiveList
              meetings={archivedMeetings}
              selectedIds={selectedMeetingIds}
              onToggleSelect={toggleMeetingSelection}
              onUnarchive={handleUnarchiveMeeting}
            />
          ) : (
            <NoteArchiveList
              notes={archivedNotes}
              selectedIds={selectedNoteIds}
              onToggleSelect={toggleNoteSelection}
              onUnarchive={handleUnarchiveNote}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 border-t border-border-subtle">
          {activeTab === "tasks" && archivedTasks.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleSelectAllTasks}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                {selectedTaskIds.size === archivedTasks.length ? "Deselect all" : "Select all"}
              </button>
              {selectedTaskIds.size > 0 && (
                <button
                  onClick={handleDeleteSelectedTasks}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  Delete {selectedTaskIds.size} item{selectedTaskIds.size !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}
          {activeTab === "meetings" && archivedMeetings.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleSelectAllMeetings}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                {selectedMeetingIds.size === archivedMeetings.length ? "Deselect all" : "Select all"}
              </button>
              {selectedMeetingIds.size > 0 && (
                <button
                  onClick={handleDeleteSelectedMeetings}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  Delete {selectedMeetingIds.size} item{selectedMeetingIds.size !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}
          {activeTab === "notes" && archivedNotes.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleSelectAllNotes}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                {selectedNoteIds.size === archivedNotes.length ? "Deselect all" : "Select all"}
              </button>
              {selectedNoteIds.size > 0 && (
                <button
                  onClick={handleDeleteSelectedNotes}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  Delete {selectedNoteIds.size} item{selectedNoteIds.size !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskArchiveList({
  tasks,
  selectedIds,
  onToggleSelect,
  onUnarchive,
}: {
  tasks: Task[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUnarchive: (id: string) => void;
}) {
  const groupedTasks = useMemo(() => groupByDate(tasks), [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-muted">No archived dailies</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedTasks.map((group) => (
        <div key={group.date || "undated"}>
          {/* Date Header */}
          <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 px-1">
            {group.label}
          </div>
          <div className="space-y-2">
            {group.items.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors",
                  selectedIds.has(task.id)
                    ? "bg-[#FFF8E1] border-[#FFDE59]"
                    : "bg-background-card border-border-subtle hover:bg-background-hover"
                )}
              >
                {/* Selection Checkbox */}
                <button
                  onClick={() => onToggleSelect(task.id)}
                  className={cn(
                    "w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors border-2",
                    selectedIds.has(task.id)
                      ? "bg-[#FFDE59] border-[#FFDE59]"
                      : "bg-white border-[#E8E0D0] hover:border-[#FFDE59]"
                  )}
                >
                  {selectedIds.has(task.id) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A4A42" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-base font-medium",
                    task.isCompleted ? "text-text-muted line-through" : "text-text-primary"
                  )}>
                    {task.title}
                  </div>
                  {task.description && (
                    <p className="text-sm text-text-muted line-clamp-2 mt-0.5">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Unarchive Button */}
                <button
                  onClick={() => onUnarchive(task.id)}
                  className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-[#F5F5F0] transition-all opacity-0 group-hover:opacity-100"
                  title="Restore"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MeetingArchiveList({
  meetings,
  selectedIds,
  onToggleSelect,
  onUnarchive,
}: {
  meetings: Meeting[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUnarchive: (id: string) => void;
}) {
  const groupedMeetings = useMemo(() => groupByDate(meetings), [meetings]);

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-muted">No archived meetings</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedMeetings.map((group) => (
        <div key={group.date || "undated"}>
          {/* Date Header */}
          <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 px-1">
            {group.label}
          </div>
          <div className="space-y-2">
            {group.items.map((meeting) => (
              <div
                key={meeting.id}
                className={cn(
                  "group flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors",
                  selectedIds.has(meeting.id)
                    ? "bg-[#DBEAFE] border-[#3B82F6]"
                    : "bg-background-card border-border-subtle hover:bg-background-hover"
                )}
              >
                {/* Selection Checkbox */}
                <button
                  onClick={() => onToggleSelect(meeting.id)}
                  className={cn(
                    "w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors border-2",
                    selectedIds.has(meeting.id)
                      ? "bg-[#3B82F6] border-[#3B82F6]"
                      : "bg-white border-[#E8E0D0] hover:border-[#3B82F6]"
                  )}
                >
                  {selectedIds.has(meeting.id) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-base font-medium",
                    meeting.isCompleted ? "text-text-muted line-through" : "text-text-primary"
                  )}>
                    {meeting.title}
                  </div>
                  <p className="text-sm text-text-muted mt-0.5">
                    {formatTimeSimple(meeting.startTime)}
                  </p>
                </div>

                {/* Unarchive Button */}
                <button
                  onClick={() => onUnarchive(meeting.id)}
                  className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-[#F5F5F0] transition-all opacity-0 group-hover:opacity-100"
                  title="Restore"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NoteArchiveList({
  notes,
  selectedIds,
  onToggleSelect,
  onUnarchive,
}: {
  notes: Note[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUnarchive: (id: string) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-muted">No archived notes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div
          key={note.id}
          className={cn(
            "group flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors",
            selectedIds.has(note.id)
              ? "bg-[#FFF8E1] border-[#FFDE59]"
              : "bg-background-card border-border-subtle hover:bg-background-hover"
          )}
        >
          {/* Selection Checkbox */}
          <button
            onClick={() => onToggleSelect(note.id)}
            className={cn(
              "w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors border-2",
              selectedIds.has(note.id)
                ? "bg-[#FFDE59] border-[#FFDE59]"
                : "bg-white border-[#E8E0D0] hover:border-[#FFDE59]"
            )}
          >
            {selectedIds.has(note.id) && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A4A42" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-base font-medium",
              note.isCompleted ? "text-text-muted line-through" : "text-text-primary"
            )}>
              {note.title}
            </div>
            {note.content && (
              <p className="text-sm text-text-muted line-clamp-2 mt-0.5">
                {note.content}
              </p>
            )}
          </div>

          {/* Unarchive Button */}
          <button
            onClick={() => onUnarchive(note.id)}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-[#F5F5F0] transition-all opacity-0 group-hover:opacity-100"
            title="Restore"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
