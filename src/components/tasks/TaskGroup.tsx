import { useState } from "react";
import { cn } from "@/utils/cn";
import { TaskRow } from "./TaskRow";
import { useUpdateCategory } from "@/hooks/useCategories";
import type { Task, Category } from "@/types";

interface TaskGroupProps {
  category: Category;
  tasks: Task[];
  isCollapsed?: boolean;
  onToggle?: () => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

const colorIndicators: Record<string, string> = {
  // New 10-color palette
  yellow: "bg-[#FFDE59]",
  orange: "bg-[#FFB366]",
  coral: "bg-[#F5A88E]",
  pink: "bg-[#F5A8D0]",
  purple: "bg-[#C4A8F5]",
  blue: "bg-[#A8C8F5]",
  teal: "bg-[#A8E6E6]",
  green: "bg-[#A8E6B4]",
  lime: "bg-[#D4E6A8]",
  gray: "bg-[#C8C8C8]",
  // Legacy colors
  development: "bg-[#FFDE59]",
  collaboration: "bg-[#FFB366]",
  client: "bg-[#F5A88E]",
};

export function TaskGroup({
  category,
  tasks,
  isCollapsed = false,
  onToggle,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}: TaskGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(category.name);
  const updateCategory = useUpdateCategory();

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingName(category.name);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editingName.trim() && editingName.trim() !== category.name) {
      updateCategory.mutate({
        id: category.id,
        type: "task",
        updates: { name: editingName.trim() },
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditingName(category.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 mb-2 w-full">
        <button onClick={onToggle} className="flex items-center gap-2">
          <div
            className={cn(
              "w-2.5 h-2.5 rounded-[3px]",
              colorIndicators[category.color]
            )}
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
            className="text-sm font-medium uppercase tracking-wide text-[#8B7355] cursor-pointer hover:text-[#6B5335] transition-colors"
          >
            {category.name}
          </span>
        )}

        <button onClick={onToggle}>
          <span className="text-sm text-text-muted">{tasks.length}</span>
        </button>
      </div>

      {/* Tasks */}
      {!isCollapsed && (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(task.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
