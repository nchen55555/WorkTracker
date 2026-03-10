import { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import type { Category } from "@/types";

const categoryColorMap: Record<string, string> = {
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
  development: "#FFDE59",
  collaboration: "#FFB366",
  client: "#F5A88E",
};

interface AddTaskInputProps {
  onAdd?: (title: string, categoryId?: string) => void;
  onClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  onEnterSelectionMode?: () => void;
  isSelectionMode?: boolean;
  categories?: Category[];
  defaultCategoryId?: string;
}

export function AddTaskInput({
  onAdd,
  onClick,
  placeholder = "Add new task...",
  disabled = false,
  onEnterSelectionMode,
  isSelectionMode = false,
  categories = [],
  defaultCategoryId,
}: AddTaskInputProps) {
  const [value, setValue] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(defaultCategoryId);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update selected category when default changes
  useEffect(() => {
    if (defaultCategoryId) {
      setSelectedCategoryId(defaultCategoryId);
    } else if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [defaultCategoryId, categories]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim() && !disabled) {
      onAdd?.(value.trim(), selectedCategoryId);
      setValue("");
    }
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        onClick={handleClick}
        className={cn(
          "flex-1 flex items-center gap-2 px-4 py-3 bg-background-card border border-border-subtle rounded-[10px] cursor-pointer hover:border-[#E8E0D0] transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="text-text-muted text-lg">+</span>

        {/* Category dropdown */}
        {categories.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[#F5F5F0] transition-colors"
            >
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: selectedCategory ? categoryColorMap[selectedCategory.color] || "#9E9E9E" : "#9E9E9E" }}
              />
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className="text-text-muted">
                <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-border-subtle rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategoryId(cat.id);
                      setShowDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background-hover transition-colors",
                      cat.id === selectedCategoryId && "bg-background-hover"
                    )}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: categoryColorMap[cat.color] || "#9E9E9E" }}
                    />
                    <span className="text-text-primary">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-lg disabled:cursor-not-allowed cursor-text"
        />
      </div>

      {onEnterSelectionMode && !isSelectionMode && (
        <button
          type="button"
          onClick={onEnterSelectionMode}
          className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors"
        >
          Select
        </button>
      )}
    </div>
  );
}
