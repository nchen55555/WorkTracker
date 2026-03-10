import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/services/supabase";
import type { Category, CategoryType } from "@/types";

// Local storage keys
const TASK_CATEGORIES_KEY = "worktracker_task_categories";
const MEETING_CATEGORIES_KEY = "worktracker_meeting_categories";

function getStorageKey(type: CategoryType): string {
  return type === "task" ? TASK_CATEGORIES_KEY : MEETING_CATEGORIES_KEY;
}

function getLocalCategories(type: CategoryType): Category[] {
  const key = getStorageKey(type);
  const stored = localStorage.getItem(key);
  if (stored) {
    return JSON.parse(stored);
  }
  // Start with empty categories - user creates their own
  return [];
}

function saveLocalCategories(type: CategoryType, categories: Category[]) {
  localStorage.setItem(getStorageKey(type), JSON.stringify(categories));
}

export function useCategories(type: CategoryType) {
  return useQuery({
    queryKey: ["categories", type],
    queryFn: async (): Promise<Category[]> => {
      // Check if Supabase is configured and user is authenticated
      if (isSupabaseConfigured() && supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("categories")
            .select("*")
            .eq("type", type)
            .order("sort_order");

          if (!error && data) {
            return data.map((cat) => ({
              id: cat.id,
              name: cat.name,
              type: cat.type,
              color: cat.color,
              sortOrder: cat.sort_order,
            }));
          }
        }
      }

      // Fall back to localStorage
      return getLocalCategories(type);
    },
    staleTime: 1000 * 30, // 30 seconds - keep fresh for inline edits to propagate
    refetchOnMount: true, // Always check for fresh data when component mounts
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; type: CategoryType; color: Category["color"] }) => {
      // Check if Supabase is configured and user is authenticated
      if (isSupabaseConfigured() && supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Get max sort order from existing categories in DB
          const { data: existingCats } = await supabase
            .from("categories")
            .select("sort_order")
            .eq("type", input.type)
            .order("sort_order", { ascending: false })
            .limit(1);

          const maxSortOrder = existingCats?.[0]?.sort_order ?? 0;

          const { data, error } = await supabase
            .from("categories")
            .insert({
              id: crypto.randomUUID(),
              user_id: user.id,
              name: input.name,
              type: input.type,
              color: input.color,
              sort_order: maxSortOrder + 1,
            })
            .select()
            .single();

          if (error) {
            console.error("Supabase error:", error);
            throw error;
          }

          return {
            id: data.id,
            name: data.name,
            type: data.type,
            color: data.color,
            sortOrder: data.sort_order,
          } as Category;
        }
      }

      // Fall back to localStorage
      const existingCategories = getLocalCategories(input.type);
      const maxSortOrder = existingCategories.length > 0
        ? Math.max(...existingCategories.map((c) => c.sortOrder))
        : 0;

      const newCategory: Category = {
        id: crypto.randomUUID(),
        name: input.name,
        type: input.type,
        color: input.color,
        sortOrder: maxSortOrder + 1,
      };

      existingCategories.push(newCategory);
      saveLocalCategories(input.type, existingCategories);
      return newCategory;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories", variables.type] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      type,
      updates,
    }: {
      id: string;
      type: CategoryType;
      updates: Partial<Pick<Category, "name" | "color">>;
    }) => {
      // Only include defined fields in the update
      const updateData: Record<string, string> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.color !== undefined) updateData.color = updates.color;

      // Don't attempt update if there's nothing to update
      if (Object.keys(updateData).length === 0) {
        return;
      }

      // Helper to update localStorage
      const updateLocalStorage = () => {
        const categories = getLocalCategories(type);
        const index = categories.findIndex((c) => c.id === id);
        if (index !== -1) {
          categories[index] = { ...categories[index], ...updates };
          saveLocalCategories(type, categories);
        }
      };

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from("categories")
            .update(updateData)
            .eq("id", id)
            .select();

          if (error) {
            // If Supabase fails (e.g., constraint violation), fall back to localStorage
            console.warn("Supabase update failed, using localStorage:", error.message);
            updateLocalStorage();
            return;
          }

          // If no rows were updated, the category might not exist in DB
          if (!data || data.length === 0) {
            updateLocalStorage();
          }
        } catch (err) {
          // Network or other error - fall back to localStorage
          console.warn("Supabase update error, using localStorage:", err);
          updateLocalStorage();
        }
        return;
      }

      // Fall back to localStorage
      updateLocalStorage();
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["categories", variables.type] });

      // Snapshot previous value
      const previousCategories = queryClient.getQueryData<Category[]>(["categories", variables.type]);

      // Optimistically update the cache
      queryClient.setQueryData<Category[]>(["categories", variables.type], (old) => {
        if (!old) return old;
        return old.map((cat) =>
          cat.id === variables.id ? { ...cat, ...variables.updates } : cat
        );
      });

      return { previousCategories };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(["categories", variables.type], context.previousCategories);
      }
    },
    onSettled: (_, _err, variables) => {
      // Always refetch after mutation to ensure server state
      queryClient.invalidateQueries({ queryKey: ["categories", variables.type] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: CategoryType }) => {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) throw error;
        return;
      }

      // Fall back to localStorage
      const categories = getLocalCategories(type);
      saveLocalCategories(
        type,
        categories.filter((c) => c.id !== id)
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories", variables.type] });
    },
  });
}

export function useMergeCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      targetId,
      type,
    }: {
      sourceId: string;
      targetId: string;
      type: CategoryType;
    }) => {
      const table = type === "task" ? "tasks" : "meetings";
      const storageKey = type === "task" ? "worktracker_tasks" : "worktracker_meetings";

      if (isSupabaseConfigured() && supabase) {
        // Update all items to point to target category
        const { error: updateError } = await supabase
          .from(table)
          .update({ category_id: targetId })
          .eq("category_id", sourceId);

        if (updateError) throw updateError;

        // Delete the source category
        const { error: deleteError } = await supabase
          .from("categories")
          .delete()
          .eq("id", sourceId);

        if (deleteError) throw deleteError;
        return;
      }

      // Fall back to localStorage
      // Update items
      const itemsStr = localStorage.getItem(storageKey);
      if (itemsStr) {
        const items = JSON.parse(itemsStr);
        const updatedItems = items.map((item: { categoryId?: string }) =>
          item.categoryId === sourceId ? { ...item, categoryId: targetId } : item
        );
        localStorage.setItem(storageKey, JSON.stringify(updatedItems));
      }

      // Delete source category
      const categories = getLocalCategories(type);
      saveLocalCategories(
        type,
        categories.filter((c) => c.id !== sourceId)
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate both categories and items
      queryClient.invalidateQueries({ queryKey: ["categories", variables.type] });
      queryClient.invalidateQueries({
        queryKey: [variables.type === "task" ? "tasks" : "meetings"],
      });
    },
  });
}
