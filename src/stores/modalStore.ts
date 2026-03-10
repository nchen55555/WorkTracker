import { create } from "zustand";
import type { Task, Meeting, Note } from "@/types";

// Initial data for creating events from calendar drag
export interface CreateEventInitialData {
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

interface ModalState {
  // Task modal
  isTaskModalOpen: boolean;
  taskModalMode: "create" | "edit";
  editingTask: Task | null;
  taskInitialData: CreateEventInitialData | null;

  // Meeting modal
  isMeetingModalOpen: boolean;
  meetingModalMode: "create" | "edit";
  editingMeeting: Meeting | null;
  meetingInitialData: CreateEventInitialData | null;

  // Note modal
  isNoteModalOpen: boolean;
  noteModalMode: "create" | "edit";
  editingNote: Note | null;

  openCreateTaskModal: (initialData?: CreateEventInitialData) => void;
  openEditTaskModal: (task: Task) => void;
  closeTaskModal: () => void;

  openCreateMeetingModal: (initialData?: CreateEventInitialData) => void;
  openEditMeetingModal: (meeting: Meeting) => void;
  closeMeetingModal: () => void;

  openCreateNoteModal: () => void;
  openEditNoteModal: (note: Note) => void;
  closeNoteModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isTaskModalOpen: false,
  taskModalMode: "create",
  editingTask: null,
  taskInitialData: null,

  isMeetingModalOpen: false,
  meetingModalMode: "create",
  editingMeeting: null,
  meetingInitialData: null,

  isNoteModalOpen: false,
  noteModalMode: "create",
  editingNote: null,

  openCreateTaskModal: (initialData) =>
    set({
      isTaskModalOpen: true,
      taskModalMode: "create",
      editingTask: null,
      taskInitialData: initialData || null,
    }),

  openEditTaskModal: (task) =>
    set({
      isTaskModalOpen: true,
      taskModalMode: "edit",
      editingTask: task,
      taskInitialData: null,
    }),

  closeTaskModal: () =>
    set({
      isTaskModalOpen: false,
      editingTask: null,
      taskInitialData: null,
    }),

  openCreateMeetingModal: (initialData) =>
    set({
      isMeetingModalOpen: true,
      meetingModalMode: "create",
      editingMeeting: null,
      meetingInitialData: initialData || null,
    }),

  openEditMeetingModal: (meeting) =>
    set({
      isMeetingModalOpen: true,
      meetingModalMode: "edit",
      editingMeeting: meeting,
      meetingInitialData: null,
    }),

  closeMeetingModal: () =>
    set({
      isMeetingModalOpen: false,
      editingMeeting: null,
      meetingInitialData: null,
    }),

  openCreateNoteModal: () =>
    set({
      isNoteModalOpen: true,
      noteModalMode: "create",
      editingNote: null,
    }),

  openEditNoteModal: (note) =>
    set({
      isNoteModalOpen: true,
      noteModalMode: "edit",
      editingNote: note,
    }),

  closeNoteModal: () =>
    set({
      isNoteModalOpen: false,
      editingNote: null,
    }),
}));
