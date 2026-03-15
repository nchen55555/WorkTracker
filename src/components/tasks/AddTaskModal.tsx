import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/utils/cn";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useMergeCategories } from "@/hooks/useCategories";
import { useTasks } from "@/hooks/useTasks";
import { useTimeEntries, useCreateTimeEntry, useDeleteTimeEntry } from "@/hooks/useTimeEntries";
import { formatDayDateTime, formatTimeSimple } from "@/utils/dates";
import type { Task, Category, CategoryColor } from "@/types";

interface PendingTimeBlock {
  id: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>, pendingTimeBlocks?: PendingTimeBlock[]) => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMarkComplete?: () => void;
  initialTask?: Partial<Task>;
  mode?: "create" | "edit";
}

const durationOptions = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
];

const categoryColorMap: Record<string, string> = {
  // New 10-color palette
  yellow: "#FFDE59",
  orange: "#FFB366",
  coral: "#F5A88E",
  pink: "#F5A8D0",
  purple: "#C4A8F5",
  blue: "#A8C8F5",
  teal: "#A8E6E6",
  green: "#A8E6B4",
  lime: "#D4E6A8",
  gray: "#C8C8C8",
  // Legacy colors for backwards compatibility
  development: "#FFDE59",
  collaboration: "#FFB366",
  client: "#F5A88E",
};

const colorOptions: { value: CategoryColor; hex: string; label: string }[] = [
  { value: "yellow", hex: "#FFDE59", label: "Yellow" },
  { value: "orange", hex: "#FFB366", label: "Orange" },
  { value: "coral", hex: "#F5A88E", label: "Coral" },
  { value: "pink", hex: "#F5A8D0", label: "Pink" },
  { value: "purple", hex: "#C4A8F5", label: "Purple" },
  { value: "blue", hex: "#A8C8F5", label: "Blue" },
  { value: "teal", hex: "#A8E6E6", label: "Teal" },
  { value: "green", hex: "#A8E6B4", label: "Green" },
  { value: "lime", hex: "#D4E6A8", label: "Lime" },
  { value: "gray", hex: "#C8C8C8", label: "Gray" },
];

export function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onArchive,
  onMarkComplete,
  initialTask,
  mode = "create",
}: AddTaskModalProps) {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories("task");
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const mergeCategories = useMergeCategories();

  // Existing tasks for "pick existing" dropdown
  const { data: allTasks = [] } = useTasks();
  const { data: allTimeEntries = [] } = useTimeEntries();
  const createTimeEntry = useCreateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = descriptionRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        adjustTextareaHeight();
      });
    }
  }, [isOpen, description]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [categoryId, setCategoryId] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // New category creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColor>("yellow");

  // Edit category state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryColor, setEditingCategoryColor] = useState<CategoryColor>("yellow");
  const [showMergePickerForId, setShowMergePickerForId] = useState<string | null>(null);

  // Existing task selection state
  const [selectedExistingTaskId, setSelectedExistingTaskId] = useState<string | null>(null);
  const [showExistingTaskDropdown, setShowExistingTaskDropdown] = useState(false);
  const [existingTaskSearch, setExistingTaskSearch] = useState("");

  // Pending time blocks (for new tasks not yet in DB)
  const [pendingTimeBlocks, setPendingTimeBlocks] = useState<PendingTimeBlock[]>([]);

  // Whether the inline "add time block" form is expanded
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  // The effective task id for time entry operations
  const effectiveTaskId = mode === "edit" && initialTask?.id ? initialTask.id : selectedExistingTaskId;

  // Time entries for the currently selected/edited task
  const taskTimeEntries = useMemo(() => {
    if (!effectiveTaskId) return [];
    return allTimeEntries.filter((e) => e.taskId === effectiveTaskId);
  }, [effectiveTaskId, allTimeEntries]);

  // Filtered tasks for dropdown search
  const filteredExistingTasks = useMemo(() => {
    const available = allTasks.filter((t) => !t.isCompleted && !t.isArchived);
    if (!existingTaskSearch.trim()) return available;
    const search = existingTaskSearch.toLowerCase();
    return available.filter((t) => t.title.toLowerCase().includes(search));
  }, [allTasks, existingTaskSearch]);

  // Initialize form when modal opens or initialTask changes
  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title || "");
        setDescription(initialTask.description || "");
        // Check time entries first, then fall back to task's own fields
        const existingEntry = initialTask.id
          ? allTimeEntries.find((e) => e.taskId === initialTask.id)
          : null;
        const effectiveStartTime = existingEntry?.startTime || initialTask.startTime;
        const effectiveEndTime = existingEntry?.endTime || initialTask.endTime;
        const effectiveDate = existingEntry?.scheduledDate || initialTask.scheduledDate;
        const effectiveDuration = existingEntry?.durationMinutes || initialTask.durationMinutes;
        setScheduledDate(effectiveDate || getDefaultDate());
        const initStart = effectiveStartTime || "09:00";
        const initDuration = effectiveDuration || 60;
        setStartTime(initStart);
        setDuration(initDuration);
        setEndTime(effectiveEndTime || calculateEndTime(initStart, initDuration));
        // Use initialTask categoryId if it's a valid UUID, otherwise use first category
        const isValidUUID = initialTask.categoryId?.includes("-");
        setCategoryId(isValidUUID ? initialTask.categoryId! : categories[0]?.id || "");
      } else {
        // Reset to defaults for new task
        setTitle("");
        setDescription("");
        setScheduledDate(getDefaultDate());
        setStartTime("09:00");
        setEndTime("10:00");
        setDuration(60);
        // Use first available category (don't default to "1")
        setCategoryId(categories[0]?.id || "");
      }
      // Reset dropdown and editing state
      setShowCategoryDropdown(false);
      setIsCreatingCategory(false);
      setNewCategoryName("");
      setNewCategoryColor("yellow");
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setEditingCategoryColor("yellow");
      setShowMergePickerForId(null);
      setSelectedExistingTaskId(null);
      setShowExistingTaskDropdown(false);
      setExistingTaskSearch("");
      setPendingTimeBlocks([]);
      // If we have initial time data (e.g. from calendar drag), open the inline add form pre-filled
      if (mode === "create" && initialTask?.startTime && initialTask?.endTime && initialTask?.scheduledDate) {
        setIsAddingBlock(true);
      } else {
        setIsAddingBlock(false);
      }
    }
  }, [isOpen, initialTask, categories, categoriesLoading]);

  function getDefaultDate() {
    return new Date().toISOString().split("T")[0];
  }

  function calculateEndTime(start: string, durationMins: number): string {
    const [hours, minutes] = start.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMins;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  }

  function calculateDurationFromTimes(start: string, end: string): number {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60; // wrap around midnight
    return diff;
  }

  // Update end time when start time or duration changes
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setEndTime(calculateEndTime(newStart, duration));
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    setEndTime(calculateEndTime(startTime, newDuration));
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const newDuration = calculateDurationFromTimes(startTime, newEnd);
    setDuration(newDuration);
  };

  const handleSelectExistingTask = (task: Task) => {
    setSelectedExistingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || "");
    setCategoryId(task.categoryId || categories[0]?.id || "");
    setShowExistingTaskDropdown(false);
    setExistingTaskSearch("");
    // Reset time fields to defaults for adding a new time block
    setScheduledDate(getDefaultDate());

    setStartTime("09:00");
    setEndTime("10:00");
    setDuration(60);
  };

  const handleClearExistingTask = () => {
    setSelectedExistingTaskId(null);
    setTitle("");
    setDescription("");
    setCategoryId(categories[0]?.id || "");
    setScheduledDate(getDefaultDate());

    setStartTime("09:00");
    setEndTime("10:00");
    setDuration(60);
  };

  const handleConfirmNewBlock = async () => {
    if (!scheduledDate || !startTime || !endTime) return;

    if (effectiveTaskId) {
      // Task exists in DB, create entry directly
      await createTimeEntry.mutateAsync({
        taskId: effectiveTaskId,
        scheduledDate,
        startTime,
        endTime,
        durationMinutes: duration,
      });
    } else {
      // New task — add to pending list
      setPendingTimeBlocks((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          scheduledDate,
          startTime,
          endTime,
          durationMinutes: duration,
        },
      ]);
    }
    setIsAddingBlock(false);
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    await deleteTimeEntry.mutateAsync(entryId);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    onSave(
      {
        id: selectedExistingTaskId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledDate: scheduledDate || undefined,
        categoryId: categoryId || undefined,
      },
      pendingTimeBlocks.length > 0 ? pendingTimeBlocks : undefined
    );
    onClose();
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    const result = await createCategory.mutateAsync({
      name: newCategoryName.trim(),
      type: "task",
      color: newCategoryColor,
    });

    setCategoryId(result.id);
    setIsCreatingCategory(false);
    setNewCategoryName("");
    setShowCategoryDropdown(false);
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setEditingCategoryColor(cat.color);
    setIsCreatingCategory(false);
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;

    await updateCategory.mutateAsync({
      id: editingCategoryId,
      type: "task",
      updates: {
        name: editingCategoryName.trim(),
        color: editingCategoryColor,
      },
    });

    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const handleDeleteCategory = async (catId: string) => {
    await deleteCategory.mutateAsync({ id: catId, type: "task" });
    // If the deleted category was selected, clear selection
    if (categoryId === catId) {
      setCategoryId("");
    }
    setEditingCategoryId(null);
  };

  const handleMergeCategory = async (sourceId: string, targetId: string) => {
    await mergeCategories.mutateAsync({
      sourceId,
      targetId,
      type: "task",
    });
    // If the merged (source) category was selected, select the target instead
    if (categoryId === sourceId) {
      setCategoryId(targetId);
    }
    setShowMergePickerForId(null);
    setEditingCategoryId(null);
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[500px] mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold text-text-primary font-serif">
            {mode === "create" ? "New Task" : "Edit Task"}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEAE5] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M1 13L13 1"
                stroke="#8B8B7A"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-6 pb-6 space-y-5">
          {/* Existing Task Selector - only in create mode */}
          {mode === "create" && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
                Existing Task
              </label>
              {selectedExistingTaskId ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-[#FFF8E1] border border-[#FFDE59] rounded-lg">
                  <span className="flex-1 text-text-primary font-medium truncate">
                    {allTasks.find((t) => t.id === selectedExistingTaskId)?.title || title}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearExistingTask}
                    className="p-1 rounded hover:bg-[#FFD633] transition-colors"
                    title="Clear selection"
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1L13 13M1 13L13 1" stroke="#8B7355" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={existingTaskSearch}
                    onChange={(e) => {
                      setExistingTaskSearch(e.target.value);
                      setShowExistingTaskDropdown(true);
                    }}
                    onFocus={() => setShowExistingTaskDropdown(true)}
                    placeholder="Search existing tasks or leave blank for new..."
                    className="w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                  />
                  {showExistingTaskDropdown && filteredExistingTasks.length > 0 && (
                    <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowExistingTaskDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-subtle rounded-lg shadow-lg z-20 py-1 max-h-[200px] overflow-y-auto">
                      {filteredExistingTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleSelectExistingTask(task)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background-hover transition-colors"
                        >
                          <span className="text-text-primary truncate">{task.title}</span>
                          {allTimeEntries.filter((e) => e.taskId === task.id).length > 0 && (
                            <span className="text-xs text-text-muted flex-shrink-0">
                              {allTimeEntries.filter((e) => e.taskId === task.id).length} block{allTimeEntries.filter((e) => e.taskId === task.id).length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Task Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task name..."
              readOnly={!!selectedExistingTaskId}
              className={cn(
                "w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors",
                selectedExistingTaskId && "bg-[#F9F9F6] cursor-default"
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Description
            </label>
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a brief description..."
              readOnly={!!selectedExistingTaskId}
              className={cn(
                "w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors resize-none overflow-hidden",
                selectedExistingTaskId && "bg-[#F9F9F6] cursor-default"
              )}
              style={{ minHeight: "60px" }}
            />
          </div>

          {/* Time Blocks */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Time Blocks
            </label>

            <div className="space-y-2">
              {/* Existing DB entries */}
              {taskTimeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-2.5 bg-[#F9F9F6] border border-border-subtle rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">
                      {formatDayDateTime(entry.scheduledDate)}{" "}
                      {formatTimeSimple(entry.startTime)} – {formatTimeSimple(entry.endTime)}
                    </span>
                    <span className="text-xs text-text-muted ml-2">
                      ({entry.durationMinutes}min)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTimeEntry(entry.id)}
                    className="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                    title="Remove time block"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Pending blocks (not yet in DB) */}
              {pendingTimeBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center gap-3 px-4 py-2.5 bg-[#FFF8E1] border border-[#FFDE59]/40 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">
                      {formatDayDateTime(block.scheduledDate)}{" "}
                      {formatTimeSimple(block.startTime)} – {formatTimeSimple(block.endTime)}
                    </span>
                    <span className="text-xs text-text-muted ml-2">
                      ({block.durationMinutes}min)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingTimeBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                    className="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                    title="Remove time block"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Inline add form — shown when isAddingBlock is true */}
              {isAddingBlock ? (
                <div className="px-4 py-3 bg-[#F9F9F6] border border-border-subtle rounded-lg space-y-3">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-border-subtle rounded-md text-sm text-text-primary focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                  />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-text-muted mb-1">Start</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-md text-sm text-text-primary focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-text-muted mb-1">End</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-md text-sm text-text-primary focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Duration</label>
                    <select
                      value={durationOptions.find((o) => o.value === duration) ? duration : "custom"}
                      onChange={(e) => {
                        if (e.target.value !== "custom") {
                          handleDurationChange(Number(e.target.value));
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#FFF8E1] border border-[#FFDE59] rounded-md text-sm text-[#8B7355] font-medium appearance-none cursor-pointer focus:outline-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238B7355' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                      }}
                    >
                      {durationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {!durationOptions.find((o) => o.value === duration) && (
                        <option value="custom">
                          {duration >= 60
                            ? `${Math.floor(duration / 60)}h ${duration % 60 ? `${duration % 60}m` : ""}`
                            : `${duration} min`}
                        </option>
                      )}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingBlock(false)}
                      className="flex-1 px-3 py-2 text-sm text-text-secondary hover:bg-white rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmNewBlock}
                      disabled={!scheduledDate || !startTime || !endTime || createTimeEntry.isPending}
                      className={cn(
                        "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        scheduledDate && startTime && endTime
                          ? "bg-[#FFDE59] text-[#5C4A1F] hover:bg-[#FFD633]"
                          : "bg-[#F5F5F0] text-text-muted cursor-not-allowed"
                      )}
                    >
                      {createTimeEntry.isPending ? "Adding..." : "Save Block"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setScheduledDate(scheduledDate || getDefaultDate());
                    setStartTime("09:00");
                    setEndTime("10:00");
                    setDuration(60);
                    setIsAddingBlock(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-border-subtle rounded-lg text-sm text-text-secondary hover:bg-background-hover hover:border-[#E8E0D0] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Add Time Block
                </button>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Category
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-border-subtle rounded-lg text-left transition-colors hover:border-[#E8E0D0]"
              >
                {selectedCategory ? (
                  <>
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: categoryColorMap[selectedCategory.color] || "#9E9E9E" }}
                    />
                    <span className="flex-1 text-text-primary">
                      {selectedCategory.name}
                    </span>
                  </>
                ) : (
                  <span className="flex-1 text-text-muted">
                    No category
                  </span>
                )}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-text-muted">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-subtle rounded-lg shadow-lg z-10 py-1 max-h-[300px] overflow-y-auto">
                  {/* No category option */}
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId("");
                      setShowCategoryDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background-hover transition-colors",
                      !categoryId && "bg-background-hover"
                    )}
                  >
                    <div className="w-3 h-3 rounded-sm border border-dashed border-text-muted" />
                    <span className="text-text-secondary">No category</span>
                  </button>

                  {/* Existing categories */}
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      {editingCategoryId === cat.id ? (
                        // Editing mode
                        <div className="px-4 py-3 space-y-3 bg-[#F9F9F6]" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            placeholder="Category name"
                            autoFocus
                            className="w-full px-3 py-2 bg-white border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEditCategory();
                              if (e.key === "Escape") setEditingCategoryId(null);
                            }}
                          />
                          <div>
                            <span className="text-xs text-text-muted mb-2 block">Color</span>
                            <div className="flex flex-wrap gap-2">
                              {colorOptions.map((option) => (
                                <div
                                  key={option.value}
                                  role="button"
                                  tabIndex={0}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingCategoryColor(option.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      setEditingCategoryColor(option.value);
                                    }
                                  }}
                                  className={cn(
                                    "w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform cursor-pointer",
                                    editingCategoryColor === option.value
                                      ? "border-text-primary"
                                      : "border-transparent"
                                  )}
                                  style={{ backgroundColor: option.hex }}
                                  title={option.label}
                                />
                              ))}
                            </div>
                          </div>
                          {/* Merge picker */}
                          {showMergePickerForId === cat.id && categories.length > 1 && (
                            <div className="mb-3">
                              <span className="text-xs text-text-muted mb-2 block">Merge into:</span>
                              <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                                {categories
                                  .filter((c) => c.id !== cat.id)
                                  .map((targetCat) => (
                                    <button
                                      key={targetCat.id}
                                      type="button"
                                      onClick={() => handleMergeCategory(cat.id, targetCat.id)}
                                      disabled={mergeCategories.isPending}
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-left bg-white border border-border-subtle rounded-md hover:bg-background-hover transition-colors"
                                    >
                                      <div
                                        className="w-3 h-3 rounded-sm"
                                        style={{ backgroundColor: categoryColorMap[targetCat.color] || "#9E9E9E" }}
                                      />
                                      <span className="text-text-primary">{targetCat.name}</span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(null);
                                setShowMergePickerForId(null);
                              }}
                              className="flex-1 px-3 py-2 text-sm text-text-secondary hover:bg-white rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                            {categories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setShowMergePickerForId(
                                  showMergePickerForId === cat.id ? null : cat.id
                                )}
                                disabled={mergeCategories.isPending}
                                className={cn(
                                  "px-3 py-2 text-sm rounded-md transition-colors",
                                  showMergePickerForId === cat.id
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-blue-500 hover:bg-blue-50"
                                )}
                              >
                                {mergeCategories.isPending ? "Merging..." : "Merge"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              disabled={deleteCategory.isPending}
                              className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSaveEditCategory();
                              }}
                              disabled={!editingCategoryName.trim() || updateCategory.isPending}
                              className={cn(
                                "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                editingCategoryName.trim()
                                  ? "bg-[#FFDE59] text-[#5C4A1F] hover:bg-[#FFD633]"
                                  : "bg-[#F5F5F0] text-text-muted cursor-not-allowed"
                              )}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Normal display mode
                        <div
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-background-hover transition-colors group",
                            cat.id === categoryId && "bg-background-hover"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryId(cat.id);
                              setShowCategoryDropdown(false);
                              setIsCreatingCategory(false);
                              setEditingCategoryId(null);
                            }}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: categoryColorMap[cat.color] || "#9E9E9E" }}
                            />
                            <span className="text-text-primary">{cat.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditCategory(cat);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                            title="Edit category"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Divider */}
                  <div className="h-px bg-border-subtle my-1" />

                  {/* Create new category option */}
                  {!isCreatingCategory ? (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background-hover transition-colors"
                    >
                      <div className="w-3 h-3 rounded-sm border border-dashed border-text-muted flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M4 1V7M1 4H7" stroke="#8B8B7A" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <span className="text-text-secondary">Create new category...</span>
                    </button>
                  ) : (
                    <div className="px-4 py-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {/* Category name input */}
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name"
                        autoFocus
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateCategory();
                          if (e.key === "Escape") setIsCreatingCategory(false);
                        }}
                      />

                      {/* Color palette */}
                      <div>
                        <span className="text-xs text-text-muted mb-2 block">Choose color</span>
                        <div className="flex flex-wrap gap-2">
                          {colorOptions.map((option) => (
                            <div
                              key={option.value}
                              role="button"
                              tabIndex={0}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setNewCategoryColor(option.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  setNewCategoryColor(option.value);
                                }
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform cursor-pointer",
                                newCategoryColor === option.value
                                  ? "border-text-primary"
                                  : "border-transparent"
                              )}
                              style={{ backgroundColor: option.hex }}
                              title={option.label}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Create/Cancel buttons */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsCreatingCategory(false);
                          }}
                          className="flex-1 px-3 py-2 text-sm text-text-secondary hover:bg-background-hover rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCreateCategory();
                          }}
                          disabled={!newCategoryName.trim() || createCategory.isPending}
                          className={cn(
                            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            newCategoryName.trim()
                              ? "bg-[#FFDE59] text-[#5C4A1F] hover:bg-[#FFD633]"
                              : "bg-[#F5F5F0] text-text-muted cursor-not-allowed"
                          )}
                        >
                          {createCategory.isPending ? "Creating..." : "Create"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div className="flex items-center gap-4">
            {mode === "edit" && onMarkComplete && (
              <button
                type="button"
                onClick={onMarkComplete}
                className="text-sm font-medium text-[#4CAF50] hover:text-[#388E3C] transition-colors"
              >
                Mark Complete
              </button>
            )}
            {mode === "edit" && onArchive && (
              <button
                type="button"
                onClick={onArchive}
                className="text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
              >
                Archive
              </button>
            )}
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-sm font-medium text-[#E57373] hover:text-[#D32F2F] transition-colors"
              >
                Delete
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || categoriesLoading}
            className={cn(
              "px-6 py-2.5 rounded-lg font-medium transition-colors",
              title.trim() && !categoriesLoading
                ? "bg-[#FFDE59] text-[#5C4A1F] hover:bg-[#FFD633]"
                : "bg-[#F5F5F0] text-text-muted cursor-not-allowed"
            )}
          >
            {categoriesLoading ? "Loading..." : "Save Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
