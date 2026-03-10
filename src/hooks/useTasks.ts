import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/services/supabase";
import type { Task } from "@/types";

// Local storage key for offline mode
const TASKS_STORAGE_KEY = "worktracker_tasks";

function getLocalTasks(): Task[] {
  const stored = localStorage.getItem(TASKS_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Start with empty tasks - user creates their own
  return [];
}

function saveLocalTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => {
      if (!isSupabaseConfigured() || !supabase) {
        return getLocalTasks().filter((t) => !t.isArchived);
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_archived", false)
        .order("scheduled_date", { ascending: true, nullsFirst: false })
        .order("start_time", { ascending: true, nullsFirst: false });

      if (error) throw error;

      return data.map((task) => ({
        id: task.id,
        categoryId: task.category_id || "1",
        title: task.title,
        description: task.description || undefined,
        scheduledDate: task.scheduled_date || undefined,
        startTime: task.start_time || undefined,
        endTime: task.end_time || undefined,
        durationMinutes: task.duration_minutes || undefined,
        isCompleted: task.is_completed,
        isArchived: task.is_archived || false,
        googleEventId: task.google_event_id || undefined,
      }));
    },
  });
}

export function useArchivedTasks() {
  return useQuery({
    queryKey: ["tasks", "archived"],
    queryFn: async (): Promise<Task[]> => {
      if (!isSupabaseConfigured() || !supabase) {
        return getLocalTasks().filter((t) => t.isArchived);
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_archived", true)
        .order("scheduled_date", { ascending: false, nullsFirst: false });

      if (error) throw error;

      return data.map((task) => ({
        id: task.id,
        categoryId: task.category_id || "1",
        title: task.title,
        description: task.description || undefined,
        scheduledDate: task.scheduled_date || undefined,
        startTime: task.start_time || undefined,
        endTime: task.end_time || undefined,
        durationMinutes: task.duration_minutes || undefined,
        isCompleted: task.is_completed,
        isArchived: task.is_archived || false,
        googleEventId: task.google_event_id || undefined,
      }));
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Task> & { title: string }) => {
      console.log("[useCreateTask] Input:", input);

      // Check if Supabase is configured and user is authenticated
      if (isSupabaseConfigured() && supabase) {
        console.log("[useCreateTask] Supabase is configured, checking auth...");
        const { data: { user } } = await supabase.auth.getUser();
        console.log("[useCreateTask] User:", user?.id, user?.email);

        if (user) {
          // Get a valid category ID - either use provided one or fetch the first available
          let validCategoryId = input.categoryId;

          // If categoryId looks like a local ID (not a UUID), fetch a real one
          if (!validCategoryId || !validCategoryId.includes("-")) {
            console.log("[useCreateTask] Invalid categoryId, fetching from Supabase...");
            const { data: categories } = await supabase
              .from("categories")
              .select("id")
              .eq("type", "task")
              .limit(1);

            if (categories && categories.length > 0) {
              validCategoryId = categories[0].id;
              console.log("[useCreateTask] Using category from DB:", validCategoryId);
            } else {
              console.error("[useCreateTask] No categories found in database");
              throw new Error("No categories available. Please create a category first.");
            }
          }

          const newTaskId = crypto.randomUUID();
          const insertPayload = {
            id: newTaskId,
            user_id: user.id,
            category_id: validCategoryId,
            title: input.title,
            description: input.description,
            scheduled_date: input.scheduledDate,
            start_time: input.startTime,
            end_time: input.endTime,
            duration_minutes: input.durationMinutes,
            is_completed: false,
          };
          console.log("[useCreateTask] Insert payload:", insertPayload);

          const { data, error } = await supabase
            .from("tasks")
            .insert(insertPayload)
            .select()
            .single();

          if (error) {
            console.error("[useCreateTask] Supabase INSERT error:", error);
            console.error("[useCreateTask] Error code:", error.code);
            console.error("[useCreateTask] Error message:", error.message);
            console.error("[useCreateTask] Error details:", error.details);
            console.error("[useCreateTask] Error hint:", error.hint);
            throw error; // Don't silently fall back - let the user know
          }

          console.log("[useCreateTask] Supabase INSERT success:", data);
          return {
            id: data.id,
            categoryId: data.category_id,
            title: data.title,
            description: data.description,
            scheduledDate: data.scheduled_date,
            startTime: data.start_time,
            endTime: data.end_time,
            durationMinutes: data.duration_minutes,
            isCompleted: data.is_completed,
          } as Task;
        } else {
          console.log("[useCreateTask] No user, falling back to localStorage");
        }
      } else {
        console.log("[useCreateTask] Supabase not configured, using localStorage");
      }

      // Fall back to localStorage (no auth or Supabase not configured)
      console.log("[useCreateTask] Saving to localStorage");
      const newTask: Task = {
        id: crypto.randomUUID(),
        categoryId: input.categoryId || "1",
        title: input.title,
        description: input.description,
        scheduledDate: input.scheduledDate,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes,
        isCompleted: false,
        isArchived: false,
      };
      const tasks = getLocalTasks();
      tasks.push(newTask);
      saveLocalTasks(tasks);
      return newTask;
    },
    onSuccess: () => {
      console.log("[useCreateTask] Success, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("[useCreateTask] Mutation error:", error);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      if (!isSupabaseConfigured() || !supabase) {
        const tasks = getLocalTasks();
        const index = tasks.findIndex((t) => t.id === id);
        if (index !== -1) {
          tasks[index] = { ...tasks[index], ...updates };
          saveLocalTasks(tasks);
        }
        return tasks[index];
      }

      // Validate categoryId is a proper UUID if provided
      let validCategoryId = updates.categoryId;
      if (validCategoryId && !validCategoryId.includes("-")) {
        console.log("[useUpdateTask] Invalid categoryId, fetching from Supabase...");
        const { data: categories } = await supabase
          .from("categories")
          .select("id")
          .eq("type", "task")
          .limit(1);

        if (categories && categories.length > 0) {
          validCategoryId = categories[0].id;
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          category_id: validCategoryId,
          title: updates.title,
          description: updates.description,
          scheduled_date: updates.scheduledDate,
          start_time: updates.startTime,
          end_time: updates.endTime,
          duration_minutes: updates.durationMinutes,
          is_completed: updates.isCompleted,
          is_archived: updates.isArchived,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      if (!isSupabaseConfigured() || !supabase) {
        const tasks = getLocalTasks();
        const index = tasks.findIndex((t) => t.id === id);
        if (index !== -1) {
          tasks[index] = { ...tasks[index], isArchived };
          saveLocalTasks(tasks);
        }
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .update({ is_archived: isArchived })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useArchiveMultipleTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, isArchived }: { ids: string[]; isArchived: boolean }) => {
      if (ids.length === 0) return;

      if (!isSupabaseConfigured() || !supabase) {
        const tasks = getLocalTasks();
        const updated = tasks.map((t) =>
          ids.includes(t.id) ? { ...t, isArchived } : t
        );
        saveLocalTasks(updated);
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .update({ is_archived: isArchived })
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured() || !supabase) {
        const tasks = getLocalTasks();
        saveLocalTasks(tasks.filter((t) => t.id !== id));
        return;
      }

      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteMultipleTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;

      if (!isSupabaseConfigured() || !supabase) {
        const tasks = getLocalTasks();
        saveLocalTasks(tasks.filter((t) => !ids.includes(t.id)));
        return;
      }

      const { error } = await supabase.from("tasks").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
