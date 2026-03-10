import { useState, useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
import type { Note } from "@/types";

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<Note>) => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMarkComplete?: () => void;
  initialNote?: Partial<Note>;
  mode?: "create" | "edit";
}

export function AddNoteModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onArchive,
  onMarkComplete,
  initialNote,
  mode = "create",
}: AddNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = contentRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        adjustTextareaHeight();
      });
    }
  }, [isOpen, content]);

  // Initialize form when modal opens or initialNote changes
  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setTitle(initialNote.title || "");
        setContent(initialNote.content || "");
      } else {
        setTitle("");
        setContent("");
      }
    }
  }, [isOpen, initialNote]);

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      content: content.trim() || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[500px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold text-text-primary font-serif">
            {mode === "create" ? "New Note" : "Edit Note"}
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
          {/* Title */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              autoFocus
              className="w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
              Content
            </label>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              className="w-full px-4 py-3 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors resize-none overflow-hidden"
              style={{ minHeight: "120px" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div className="flex items-center gap-4">
            {mode === "edit" && onMarkComplete && (
              <button
                type="button"
                onClick={onMarkComplete}
                className="text-sm font-medium text-[#FFDE59] hover:text-[#D4B82F] transition-colors"
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
            disabled={!title.trim()}
            className={cn(
              "px-6 py-2.5 rounded-lg font-medium transition-colors",
              title.trim()
                ? "bg-[#FFDE59] text-[#5C4A1F] hover:bg-[#FFD633]"
                : "bg-[#F5F5F0] text-text-muted cursor-not-allowed"
            )}
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
