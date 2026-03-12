import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/services/supabase";
import type { TimeEntry } from "@/types";

const TIME_ENTRIES_STORAGE_KEY = "worktracker_time_entries";

function getLocalTimeEntries(): TimeEntry[] {
  const stored = localStorage.getItem(TIME_ENTRIES_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

function saveLocalTimeEntries(entries: TimeEntry[]) {
  localStorage.setItem(TIME_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
}

export function useTimeEntries() {
  return useQuery({
    queryKey: ["time_entries"],
    queryFn: async (): Promise<TimeEntry[]> => {
      if (!isSupabaseConfigured() || !supabase) {
        return getLocalTimeEntries();
      }

      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      return data.map((entry: any) => ({
        id: entry.id,
        taskId: entry.task_id,
        scheduledDate: entry.scheduled_date,
        startTime: entry.start_time,
        endTime: entry.end_time,
        durationMinutes: entry.duration_minutes,
      }));
    },
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<TimeEntry, "id"> & { id?: string }) => {
      if (isSupabaseConfigured() && supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const newId = input.id || crypto.randomUUID();
          const { data, error } = await supabase
            .from("time_entries")
            .insert({
              id: newId,
              user_id: user.id,
              task_id: input.taskId,
              scheduled_date: input.scheduledDate,
              start_time: input.startTime,
              end_time: input.endTime,
              duration_minutes: input.durationMinutes,
            })
            .select()
            .single();

          if (error) throw error;

          return {
            id: data.id,
            taskId: data.task_id,
            scheduledDate: data.scheduled_date,
            startTime: data.start_time,
            endTime: data.end_time,
            durationMinutes: data.duration_minutes,
          } as TimeEntry;
        }
      }

      // localStorage fallback
      const newEntry: TimeEntry = {
        id: input.id || crypto.randomUUID(),
        taskId: input.taskId,
        scheduledDate: input.scheduledDate,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes,
      };
      const entries = getLocalTimeEntries();
      entries.push(newEntry);
      saveLocalTimeEntries(entries);
      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<TimeEntry, "id" | "taskId">>;
    }) => {
      if (!isSupabaseConfigured() || !supabase) {
        const entries = getLocalTimeEntries();
        const index = entries.findIndex((e) => e.id === id);
        if (index !== -1) {
          entries[index] = { ...entries[index], ...updates };
          saveLocalTimeEntries(entries);
        }
        return entries[index];
      }

      const { error } = await supabase
        .from("time_entries")
        .update({
          scheduled_date: updates.scheduledDate,
          start_time: updates.startTime,
          end_time: updates.endTime,
          duration_minutes: updates.durationMinutes,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured() || !supabase) {
        const entries = getLocalTimeEntries();
        saveLocalTimeEntries(entries.filter((e) => e.id !== id));
        return;
      }

      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
