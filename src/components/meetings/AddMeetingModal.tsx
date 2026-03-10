import { useState, useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useMergeCategories } from "@/hooks/useCategories";
import type { Meeting, Category, CategoryColor } from "@/types";

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

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Partial<Meeting>) => void;
  onDelete?: () => void;
  initialMeeting?: Partial<Meeting>;
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
];

export function AddMeetingModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialMeeting,
  mode = "create",
}: AddMeetingModalProps) {
  const { data: categories = [] } = useCategories("meeting");
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const mergeCategories = useMergeCategories();

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
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [isAllDay, setIsAllDay] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);

  // Edit category state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryColor, setEditingCategoryColor] = useState<CategoryColor>("yellow");
  const [showMergePickerForId, setShowMergePickerForId] = useState<string | null>(null);

  // Create new category state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColor>("yellow");

  // Initialize form when modal opens or initialMeeting changes
  useEffect(() => {
    if (isOpen) {
      if (initialMeeting) {
        setTitle(initialMeeting.title || "");
        setDescription(initialMeeting.description || "");
        setScheduledDate(initialMeeting.scheduledDate || getDefaultDate());
        setEndDate(initialMeeting.endDate || initialMeeting.scheduledDate || getDefaultDate());
        setStartTime(initialMeeting.startTime || "09:00");
        setDuration(initialMeeting.durationMinutes || 60);
        setIsAllDay(initialMeeting.isAllDay || false);
        // Check if multi-day by comparing dates
        const hasEndDate = initialMeeting.endDate && initialMeeting.endDate !== initialMeeting.scheduledDate;
        setIsMultiDay(hasEndDate || false);
        // Set the category
        setSelectedCalendarId(initialMeeting.categoryId || "");
      } else {
        setTitle("");
        setDescription("");
        setScheduledDate(getDefaultDate());
        setEndDate(getDefaultDate());
        setStartTime("09:00");
        setDuration(60);
        setIsAllDay(false);
        setIsMultiDay(false);
        // Default to first category
        setSelectedCalendarId(categories[0]?.id || "");
      }
      // Reset dropdown and editing state
      setShowCalendarDropdown(false);
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setEditingCategoryColor("yellow");
      setShowMergePickerForId(null);
      // Reset create state
      setIsCreatingCategory(false);
      setNewCategoryName("");
      setNewCategoryColor("yellow");
    }
  }, [isOpen, initialMeeting, categories]);

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

  const handleSave = () => {
    if (!title.trim()) return;

    const isFullDay = isAllDay || isMultiDay;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      scheduledDate,
      endDate: isMultiDay ? endDate : undefined,
      startTime: isFullDay ? "00:00" : startTime,
      endTime: isFullDay ? "23:59" : calculateEndTime(startTime, duration),
      durationMinutes: isFullDay ? 1440 : duration,
      isAllDay: isFullDay,
      categoryId: selectedCalendarId || undefined,
    });
    onClose();
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setEditingCategoryColor(cat.color);
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;

    await updateCategory.mutateAsync({
      id: editingCategoryId,
      type: "meeting",
      updates: {
        name: editingCategoryName.trim(),
        color: editingCategoryColor,
      },
    });

    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const handleDeleteCategory = async (catId: string) => {
    await deleteCategory.mutateAsync({ id: catId, type: "meeting" });
    // If the deleted category was selected, clear selection
    if (selectedCalendarId === catId) {
      setSelectedCalendarId("");
    }
    setEditingCategoryId(null);
  };

  const handleMergeCategory = async (sourceId: string, targetId: string) => {
    await mergeCategories.mutateAsync({
      sourceId,
      targetId,
      type: "meeting",
    });
    // If the merged (source) category was selected, select the target instead
    if (selectedCalendarId === sourceId) {
      setSelectedCalendarId(targetId);
    }
    setShowMergePickerForId(null);
    setEditingCategoryId(null);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newCat = await createCategory.mutateAsync({
      name: newCategoryName.trim(),
      type: "meeting",
      color: newCategoryColor,
    });

    // Select the newly created category
    setSelectedCalendarId(newCat.id);
    setIsCreatingCategory(false);
    setNewCategoryName("");
    setNewCategoryColor("yellow");
    setShowCalendarDropdown(false);
  };

  const selectedCategory = categories.find((c) => c.id === selectedCalendarId);

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
            {mode === "create" ? "New Meeting" : "Edit Meeting"}
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
          {/* Meeting Title */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Meeting Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter meeting title..."
              className="w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
            />
          </div>

          {/* All Day & Multi-Day Toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={isAllDay}
                onClick={() => {
                  if (!isAllDay) {
                    setIsAllDay(true);
                    setIsMultiDay(false);
                  } else {
                    setIsAllDay(false);
                  }
                }}
                className={cn(
                  "relative w-9 h-5 rounded-full transition-colors",
                  isAllDay ? "bg-[#FFDE59]" : "bg-[#E0E0D8]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    isAllDay && "translate-x-4"
                  )}
                />
              </button>
              <span className="text-sm text-text-primary">All day</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={isMultiDay}
                onClick={() => {
                  if (!isMultiDay) {
                    setIsMultiDay(true);
                    setIsAllDay(false);
                  } else {
                    setIsMultiDay(false);
                  }
                }}
                className={cn(
                  "relative w-9 h-5 rounded-full transition-colors",
                  isMultiDay ? "bg-[#FFDE59]" : "bg-[#E0E0D8]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    isMultiDay && "translate-x-4"
                  )}
                />
              </button>
              <span className="text-sm text-text-primary">Multiple days</span>
            </label>
          </div>

          {/* Date, Start Time & Duration */}
          <div className="flex gap-3">
            <div className={isMultiDay ? "w-[130px]" : "flex-1"}>
              <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
                {isMultiDay ? "Start Date" : "Date"}
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  // If end date is before start date, update it
                  if (e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
              />
            </div>

            {isMultiDay && (
              <div className="w-[130px]">
                <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={scheduledDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                />
              </div>
            )}

            {!isAllDay && !isMultiDay && (
              <>
                <div className="w-[100px]">
                  <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-3 bg-white border border-border-subtle rounded-lg text-text-primary focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                  />
                </div>

                <div className="w-[100px]">
                  <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-3 bg-[#FFF8E1] border border-[#FFDE59] rounded-lg text-[#8B7355] font-medium appearance-none cursor-pointer focus:outline-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238B7355' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                    }}
                  >
                    {durationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Category
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
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
                    {categories.length === 0 ? "No categories available" : "Select category"}
                  </span>
                )}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-text-muted">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {showCalendarDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-subtle rounded-lg shadow-lg z-10 py-1 max-h-[300px] overflow-y-auto">
                  {/* No category option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCalendarId("");
                      setShowCalendarDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background-hover transition-colors",
                      !selectedCalendarId && "bg-background-hover"
                    )}
                  >
                    <div className="w-3 h-3 rounded-sm border border-dashed border-text-muted" />
                    <span className="text-text-secondary">No category</span>
                  </button>

                  {/* Available categories */}
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      {editingCategoryId === cat.id ? (
                        // Editing mode
                        <div className="px-4 py-3 space-y-3 bg-[#F9F9F6]" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            placeholder="Calendar name"
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
                              onMouseDown={(e) => e.stopPropagation()}
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
                            cat.id === selectedCalendarId && "bg-background-hover"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCalendarId(cat.id);
                              setShowCalendarDropdown(false);
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
                            title="Edit calendar"
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

                  {/* Create new calendar option */}
                  {isCreatingCategory ? (
                    <div className="px-4 py-3 space-y-3 bg-[#F9F9F6] border-t border-border-subtle" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Calendar name"
                        autoFocus
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateCategory();
                          if (e.key === "Escape") setIsCreatingCategory(false);
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
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsCreatingCategory(false);
                          }}
                          className="flex-1 px-3 py-2 text-sm text-text-secondary hover:bg-white rounded-md transition-colors"
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
                          Create
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background-hover transition-colors border-t border-border-subtle"
                    >
                      <div className="w-3 h-3 rounded-sm border border-dashed border-[#FFDE59] flex items-center justify-center">
                        <span className="text-[10px] text-[#FFDE59]">+</span>
                      </div>
                      <span className="text-[#8B7355] font-medium">Create new calendar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Notes
            </label>
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add meeting notes..."
              className="w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors resize-none overflow-hidden"
              style={{ minHeight: "60px" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div className="flex items-center gap-4">
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
            disabled={!title.trim()}
            className={cn(
              "px-6 py-2.5 rounded-lg font-medium transition-colors",
              title.trim()
                ? "bg-[#FFDE59] text-[#5C4A1F] hover:bg-[#FFD633]"
                : "bg-[#F5F5F0] text-text-muted cursor-not-allowed"
            )}
          >
            Save Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
