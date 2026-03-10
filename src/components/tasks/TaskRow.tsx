import { cn } from "@/utils/cn";
import { formatDayDateTime, formatTimeSimple } from "@/utils/dates";
import { useModalStore } from "@/stores/modalStore";
import { useUpdateTask, useArchiveTask, useDeleteTask } from "@/hooks/useTasks";
import type { Task } from "@/types";

interface TaskRowProps {
  task: Task;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function TaskRow({
  task,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: TaskRowProps) {
  const { openEditTaskModal } = useModalStore();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const deleteTask = useDeleteTask();

  // Format as "Mon 9:00 – 11:00"
  const getDateTimeDisplay = () => {
    if (!task.scheduledDate) return "";

    if (task.startTime && task.endTime) {
      const dayName = formatDayDateTime(task.scheduledDate);
      return `${dayName} ${formatTimeSimple(task.startTime)} – ${formatTimeSimple(task.endTime)}`;
    }

    if (task.startTime) {
      return formatDayDateTime(task.scheduledDate, task.startTime);
    }

    return formatDayDateTime(task.scheduledDate);
  };

  const dateTimeText = getDateTimeDisplay();

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect?.(task.id);
    } else {
      openEditTaskModal(task);
    }
  };

  const handleCompletionCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelectionMode) {
      updateTask.mutate({
        id: task.id,
        updates: { isCompleted: !task.isCompleted },
      });
    }
  };

  const handleSelectionCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(task.id);
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    archiveTask.mutate({ id: task.id, isArchived: true });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask.mutate(task.id);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 bg-background-card border border-border-subtle rounded-[10px]",
        "cursor-pointer hover:bg-background-hover hover:border-[#E8E0D0] transition-colors",
        task.isCompleted && "opacity-60",
        isSelected && "bg-[#FFF8E1] border-[#FFDE59]"
      )}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <button
          onClick={handleSelectionCheckboxClick}
          className={cn(
            "w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors border-2",
            isSelected
              ? "bg-[#FFDE59] border-[#FFDE59]"
              : "bg-white border-[#E8E0D0] hover:border-[#FFDE59]"
          )}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A4A42" strokeWidth="3" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-lg font-medium truncate",
            task.isCompleted
              ? "text-text-muted line-through"
              : "text-text-primary"
          )}
        >
          {task.title}
        </div>
        {dateTimeText && (
          <div className={cn(
            "text-sm",
            task.isCompleted ? "text-text-muted" : "text-text-secondary"
          )}>
            {dateTimeText}
          </div>
        )}
        {task.description && (
          <div className={cn(
            "text-sm mt-1 line-clamp-2",
            task.isCompleted ? "text-text-muted" : "text-text-muted"
          )}>
            {task.description}
          </div>
        )}
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
              task.isCompleted
                ? "bg-[#FFDE59] border-[#FFDE59]"
                : "bg-white border-[#E8E0D0] hover:border-[#FFDE59]"
            )}
          >
            {task.isCompleted && (
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
