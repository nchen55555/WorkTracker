export type ViewType = "dailies" | "meetings" | "notes";

export type CategoryType = "task" | "meeting" | "note";

export type CategoryColor =
  | "yellow"
  | "orange"
  | "coral"
  | "pink"
  | "purple"
  | "blue"
  | "teal"
  | "green"
  | "lime"
  | "gray"
  // Legacy colors for backwards compatibility
  | "development"
  | "collaboration"
  | "client";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: CategoryColor;
  sortOrder: number;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface Task {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  isCompleted: boolean;
  isArchived: boolean;
  googleEventId?: string;
  timeEntries?: TimeEntry[];
}

export interface Meeting {
  id: string;
  categoryId?: string;
  title: string;
  description?: string;
  scheduledDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  attendees?: string[];
  location?: string;
  meetingLink?: string;
  isFromGoogle: boolean;
  googleEventId?: string;
  googleCalendarId?: string;
  isAllDay?: boolean;
  isCompleted: boolean;
  isArchived: boolean;
}

export interface Note {
  id: string;
  categoryId?: string;
  title: string;
  content?: string;
  isCompleted: boolean;
  isArchived: boolean;
}

export interface CalendarEvent {
  id: string;
  taskId?: string;
  title: string;
  type: "task" | "meeting";
  categoryColor: CategoryColor;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  attendees?: string[];
  isAllDay?: boolean;
}

export interface GoogleCalendar {
  id: string;
  name: string;
  displayName?: string;
  color: string;
  selected: boolean;
  accessRole?: string;
  freeBusyTitle?: string;
}

export interface GoogleAccount {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string | null;
  calendars: GoogleCalendar[];
  lastSyncAt: string | null;
}
