import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/services/supabase";
import type { Note } from "@/types";

// Local storage key for offline mode
const NOTES_STORAGE_KEY = "worktracker_notes";

function getLocalNotes(): Note[] {
  const stored = localStorage.getItem(NOTES_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

function saveLocalNotes(notes: Note[]) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: async (): Promise<Note[]> => {
      if (!isSupabaseConfigured() || !supabase) {
        return getLocalNotes().filter((n) => !n.isArchived);
      }

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((note) => ({
        id: note.id,
        categoryId: note.category_id || undefined,
        title: note.title,
        content: note.description || undefined,
        isCompleted: note.is_completed,
        isArchived: note.is_archived || false,
      }));
    },
  });
}

export function useArchivedNotes() {
  return useQuery({
    queryKey: ["notes", "archived"],
    queryFn: async (): Promise<Note[]> => {
      if (!isSupabaseConfigured() || !supabase) {
        return getLocalNotes().filter((n) => n.isArchived);
      }

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("is_archived", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((note) => ({
        id: note.id,
        categoryId: note.category_id || undefined,
        title: note.title,
        content: note.description || undefined,
        isCompleted: note.is_completed,
        isArchived: note.is_archived || false,
      }));
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Note> & { title: string }) => {
      if (isSupabaseConfigured() && supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const newNoteId = crypto.randomUUID();
          const insertPayload = {
            id: newNoteId,
            user_id: user.id,
            category_id: input.categoryId || null,
            title: input.title,
            description: input.content || null,
            is_completed: false,
          };

          const { data, error } = await supabase
            .from("reminders")
            .insert(insertPayload)
            .select()
            .single();

          if (error) {
            console.error("[useCreateNote] Supabase INSERT error:", error);
            throw error;
          }

          return {
            id: data.id,
            categoryId: data.category_id,
            title: data.title,
            content: data.description,
            isCompleted: data.is_completed,
          } as Note;
        }
      }

      // Fall back to localStorage
      const newNote: Note = {
        id: crypto.randomUUID(),
        categoryId: input.categoryId,
        title: input.title,
        content: input.content,
        isCompleted: false,
        isArchived: false,
      };
      const notes = getLocalNotes();
      notes.unshift(newNote);
      saveLocalNotes(notes);
      return newNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Note> }) => {
      if (!isSupabaseConfigured() || !supabase) {
        const notes = getLocalNotes();
        const index = notes.findIndex((n) => n.id === id);
        if (index !== -1) {
          notes[index] = { ...notes[index], ...updates };
          saveLocalNotes(notes);
        }
        return notes[index];
      }

      const { error } = await supabase
        .from("reminders")
        .update({
          category_id: updates.categoryId,
          title: updates.title,
          description: updates.content,
          is_completed: updates.isCompleted,
          is_archived: updates.isArchived,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useArchiveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      if (!isSupabaseConfigured() || !supabase) {
        const notes = getLocalNotes();
        const index = notes.findIndex((n) => n.id === id);
        if (index !== -1) {
          notes[index] = { ...notes[index], isArchived };
          saveLocalNotes(notes);
        }
        return;
      }

      const { error } = await supabase
        .from("reminders")
        .update({ is_archived: isArchived })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useArchiveMultipleNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, isArchived }: { ids: string[]; isArchived: boolean }) => {
      if (ids.length === 0) return;

      if (!isSupabaseConfigured() || !supabase) {
        const notes = getLocalNotes();
        const updated = notes.map((n) =>
          ids.includes(n.id) ? { ...n, isArchived } : n
        );
        saveLocalNotes(updated);
        return;
      }

      const { error } = await supabase
        .from("reminders")
        .update({ is_archived: isArchived })
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured() || !supabase) {
        const notes = getLocalNotes();
        saveLocalNotes(notes.filter((n) => n.id !== id));
        return;
      }

      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteMultipleNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;

      if (!isSupabaseConfigured() || !supabase) {
        const notes = getLocalNotes();
        saveLocalNotes(notes.filter((n) => !ids.includes(n.id)));
        return;
      }

      const { error } = await supabase.from("reminders").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
