import { cn } from "@/utils/cn";

interface AddNoteInputProps {
  onClick: () => void;
  disabled?: boolean;
  onEnterSelectionMode?: () => void;
  isSelectionMode?: boolean;
}

export function AddNoteInput({
  onClick,
  disabled,
  onEnterSelectionMode,
  isSelectionMode = false,
}: AddNoteInputProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        onClick={!disabled ? onClick : undefined}
        className={cn(
          "flex-1 flex items-center gap-3 px-4 py-3 bg-background-card border border-border-subtle rounded-[10px] cursor-pointer hover:border-[#E8E0D0] transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="text-text-muted text-lg">+</span>
        <span className="text-lg text-text-muted">
          Add new note...
        </span>
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
