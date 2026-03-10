import { AddNoteInput } from "./AddNoteInput";
import { NoteRow } from "./NoteRow";
import { AddNoteModal } from "./AddNoteModal";
import { SelectionToolbar } from "@/components/shared/SelectionToolbar";
import { useModalStore } from "@/stores/modalStore";
import { useSelectionStore } from "@/stores/selectionStore";
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useArchiveNote,
  useDeleteMultipleNotes,
} from "@/hooks/useNotes";
import type { Note } from "@/types";

export function NoteList() {
  const { data: notes = [], isLoading } = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const archiveNote = useArchiveNote();
  const deleteMultipleNotes = useDeleteMultipleNotes();

  const {
    isNoteModalOpen,
    noteModalMode,
    editingNote,
    openCreateNoteModal,
    closeNoteModal,
  } = useModalStore();

  const {
    isSelectionMode,
    activeSelectionType,
    selectedNoteIds,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useSelectionStore();

  const isNoteSelectionActive = isSelectionMode && activeSelectionType === "notes";

  const handleToggleSelect = (id: string) => {
    toggleSelection("notes", id);
  };

  const handleSelectAll = () => {
    selectAll("notes", notes.map((n) => n.id));
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedNoteIds);
    deleteMultipleNotes.mutate(ids, {
      onSuccess: () => {
        exitSelectionMode();
      },
    });
  };

  const handleEnterSelectionMode = () => {
    enterSelectionMode("notes");
  };

  const handleSaveNote = (noteData: Partial<Note>) => {
    if (noteModalMode === "create") {
      createNote.mutate({
        title: noteData.title!,
        content: noteData.content,
      });
    } else if (editingNote) {
      updateNote.mutate({ id: editingNote.id, updates: noteData });
    }
  };

  const handleDeleteNote = () => {
    if (editingNote) {
      deleteNote.mutate(editingNote.id);
      closeNoteModal();
    }
  };

  const handleMarkComplete = () => {
    if (editingNote) {
      updateNote.mutate({
        id: editingNote.id,
        updates: { isCompleted: true },
      });
      closeNoteModal();
    }
  };

  const handleArchiveNote = () => {
    if (editingNote) {
      archiveNote.mutate({ id: editingNote.id, isArchived: true });
      closeNoteModal();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary">
        Loading...
      </div>
    );
  }

  // Separate active and completed notes
  const activeNotes = notes.filter((n) => !n.isCompleted);
  const completedNotes = notes.filter((n) => n.isCompleted);

  return (
    <>
      <div className="flex flex-col gap-4 relative pb-20">
        <AddNoteInput
          onClick={openCreateNoteModal}
          disabled={createNote.isPending}
          onEnterSelectionMode={handleEnterSelectionMode}
          isSelectionMode={isNoteSelectionActive}
        />

        <div className="mt-2 space-y-3">
          {/* Active notes */}
          {activeNotes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              isSelectionMode={isNoteSelectionActive}
              isSelected={selectedNoteIds.has(note.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}

          {/* Completed notes */}
          {completedNotes.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-medium uppercase tracking-wide text-text-muted mb-3">
                Completed
              </div>
              <div className="space-y-3">
                {completedNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    isSelectionMode={isNoteSelectionActive}
                    isSelected={selectedNoteIds.has(note.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {notes.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              No notes yet. Add one above!
            </div>
          )}
        </div>

        {isNoteSelectionActive && (
          <SelectionToolbar
            selectedCount={selectedNoteIds.size}
            totalCount={notes.length}
            onSelectAll={handleSelectAll}
            onClearSelection={() => clearSelection("notes")}
            onDelete={handleDeleteSelected}
            onCancel={exitSelectionMode}
            isDeleting={deleteMultipleNotes.isPending}
            accentColor="#FFDE59"
          />
        )}
      </div>

      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={closeNoteModal}
        onSave={handleSaveNote}
        onDelete={noteModalMode === "edit" ? handleDeleteNote : undefined}
        onArchive={noteModalMode === "edit" ? handleArchiveNote : undefined}
        onMarkComplete={
          noteModalMode === "edit" && !editingNote?.isCompleted
            ? handleMarkComplete
            : undefined
        }
        initialNote={editingNote || undefined}
        mode={noteModalMode}
      />
    </>
  );
}
