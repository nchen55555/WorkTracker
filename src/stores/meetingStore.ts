import { create } from "zustand";
import type { Meeting, Category } from "@/types";

// Default meeting categories
const defaultCategories: Category[] = [
  { id: "m1", name: "Team Meetings", type: "meeting", color: "development", sortOrder: 1 },
  { id: "m2", name: "Client Calls", type: "meeting", color: "client", sortOrder: 2 },
  { id: "m3", name: "One-on-Ones", type: "meeting", color: "collaboration", sortOrder: 3 },
];

// Sample meetings to start with
const initialMeetings: Meeting[] = [
  {
    id: "m1",
    categoryId: "m1",
    title: "Daily standup",
    scheduledDate: "2026-03-03",
    startTime: "10:00",
    endTime: "10:30",
    durationMinutes: 30,
    attendees: ["Engineering"],
    isFromGoogle: false,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "m2",
    categoryId: "m1",
    title: "Sprint planning",
    scheduledDate: "2026-03-03",
    startTime: "14:00",
    endTime: "15:00",
    durationMinutes: 60,
    attendees: ["Product Team"],
    isFromGoogle: false,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "m3",
    categoryId: "m1",
    title: "Design review",
    scheduledDate: "2026-03-05",
    startTime: "15:00",
    endTime: "15:45",
    durationMinutes: 45,
    attendees: ["Design Team"],
    isFromGoogle: false,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "m4",
    categoryId: "m2",
    title: "Acme Corp kickoff",
    scheduledDate: "2026-03-04",
    startTime: "11:00",
    endTime: "12:00",
    durationMinutes: 60,
    attendees: ["Sarah", "Mike"],
    isFromGoogle: true,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "m5",
    categoryId: "m2",
    title: "Quarterly review",
    scheduledDate: "2026-03-06",
    startTime: "14:00",
    endTime: "15:30",
    durationMinutes: 90,
    attendees: ["Globex Inc"],
    isFromGoogle: true,
    isCompleted: false,
    isArchived: false,
  },
  {
    id: "m6",
    categoryId: "m3",
    title: "1:1 with Alex",
    scheduledDate: "2026-03-07",
    startTime: "11:00",
    endTime: "11:30",
    durationMinutes: 30,
    attendees: ["Weekly sync"],
    isFromGoogle: false,
    isCompleted: false,
    isArchived: false,
  },
];

interface MeetingState {
  meetings: Meeting[];
  categories: Category[];
  addMeeting: (title: string, categoryId?: string) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  meetings: initialMeetings,
  categories: defaultCategories,

  addMeeting: (title, categoryId = "m1") => {
    const today = new Date().toISOString().split("T")[0];
    const newMeeting: Meeting = {
      id: crypto.randomUUID(),
      categoryId,
      title,
      scheduledDate: today,
      startTime: "09:00",
      endTime: "10:00",
      durationMinutes: 60,
      isFromGoogle: false,
      isCompleted: false,
      isArchived: false,
    };
    set((state) => ({ meetings: [...state.meetings, newMeeting] }));
  },

  updateMeeting: (id, updates) => {
    set((state) => ({
      meetings: state.meetings.map((meeting) =>
        meeting.id === id ? { ...meeting, ...updates } : meeting
      ),
    }));
  },

  deleteMeeting: (id) => {
    set((state) => ({
      meetings: state.meetings.filter((meeting) => meeting.id !== id),
    }));
  },
}));
