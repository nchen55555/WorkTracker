import { cn } from "@/utils/cn";

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  accentColor?: string;
}

export function SelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  onCancel,
  isDeleting = false,
  accentColor = "#FFDE59",
}: SelectionToolbarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg",
          "bg-white/95 backdrop-blur-sm border border-gray-200"
        )}
      >
        {/* Selected count */}
        <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: accentColor, color: "#4A4A42" }}
          >
            {selectedCount}
          </div>
          <span className="text-sm text-text-secondary">selected</span>
        </div>

        {/* Select All / Clear */}
        <button
          onClick={allSelected ? onClearSelection : onSelectAll}
          className="px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-gray-100 rounded-lg transition-colors"
        >
          {allSelected ? "Clear All" : "Select All"}
        </button>

        {/* Delete button */}
        <button
          onClick={onDelete}
          disabled={selectedCount === 0 || isDeleting}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-lg transition-colors",
            selectedCount > 0 && !isDeleting
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          {isDeleting ? "Deleting..." : `Delete (${selectedCount})`}
        </button>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
