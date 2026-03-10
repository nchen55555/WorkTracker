import { create } from "zustand";
import type { Task, Category } from "@/types";

// Default categories
const defaultCategories: Category[] = [
  { id: "1", name: "Development", type: "task", color: "development", sortOrder: 1 },
  { id: "2", name: "Collaboration", type: "task", color: "collaboration", sortOrder: 2 },
  { id: "3", name: "Client Work", type: "task", color: "client", sortOrder: 3 },
];

// Sample tasks to start with
const initialTasks: Task[] = [
  {
    id: "1",
    categoryId: "1",
    title: "Design system review",
    scheduledDate: "2026-03-03",
    startTime: "09:00",
    endTime: "11:00",
    durationMinutes: 120,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "2",
    categoryId: "1",
    title: "API integration",
    scheduledDate: "2026-03-04",
    startTime: "13:00",
    endTime: "16:00",
    durationMinutes: 180,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "3",
    categoryId: "1",
    title: "Write documentation",
    scheduledDate: "2026-03-05",
    startTime: "14:00",
    endTime: "15:30",
    durationMinutes: 90,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "4",
    categoryId: "2",
    title: "Team standup",
    scheduledDate: "2026-03-03",
    startTime: "10:00",
    endTime: "10:30",
    durationMinutes: 30,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "5",
    categoryId: "3",
    title: "Client presentation",
    scheduledDate: "2026-03-06",
    startTime: "11:00",
    endTime: "12:00",
    durationMinutes: 60,
    isCompleted: false,
    isArchived: false,
  },
];

interface TaskState {
  tasks: Task[];
  categories: Category[];
  addTask: (title: string, categoryId?: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: initialTasks,
  categories: defaultCategories,

  addTask: (title, categoryId = "1") => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      categoryId,
      title,
      isCompleted: false,
      isArchived: false,
    };
    set((state) => ({ tasks: [...state.tasks, newTask] }));
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }));
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },

  toggleComplete: (id) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      ),
    }));
  },
}));
