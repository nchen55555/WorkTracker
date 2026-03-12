import { useMemo, useCallback } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { DayHeaders } from "./DayHeaders";
import { CalendarGrid } from "./CalendarGrid";
import { useCalendarStore } from "@/stores/calendarStore";
import { useModalStore, type CreateEventInitialData } from "@/stores/modalStore";
import { useViewStore } from "@/stores/viewStore";
import { useTasks } from "@/hooks/useTasks";
import { useTimeEntries, useUpdateTimeEntry } from "@/hooks/useTimeEntries";
import { useMeetings, useUpdateMeeting } from "@/hooks/useMeetings";
import { useCategories } from "@/hooks/useCategories";
import { getViewDays } from "@/utils/dates";
import type { CalendarEvent } from "@/types";

export function WeeklyCalendar() {
  const { currentDate, viewMode } = useCalendarStore();
  const { openEditTaskModal, openEditMeetingModal, openCreateTaskModal, openCreateMeetingModal } = useModalStore();
  const { activeView } = useViewStore();
  const { data: tasks = [] } = useTasks();
  const { data: timeEntries = [] } = useTimeEntries();
  const { data: meetings = [] } = useMeetings();
  const { data: taskCategories = [] } = useCategories("task");
  const { data: meetingCategories = [] } = useCategories("meeting");
  const updateTimeEntry = useUpdateTimeEntry();
  const updateMeeting = useUpdateMeeting();

  const days = getViewDays(currentDate, viewMode);

  // Handle drag-to-create on calendar
  const handleDragCreate = useCallback((data: CreateEventInitialData) => {
    // Determine event type based on active sidebar panel
    // "dailies" -> Task, "meetings" -> Meeting, "notes" -> default to Task
    if (activeView === "meetings") {
      openCreateMeetingModal(data);
    } else {
      openCreateTaskModal(data);
    }
  }, [activeView, openCreateTaskModal, openCreateMeetingModal]);

  // Handle event resize on calendar
  const handleEventResize = useCallback((data: { eventId: string; startTime: string; endTime: string; durationMinutes: number }) => {
    // Check if this is a time entry or a meeting
    const timeEntry = timeEntries.find((e) => e.id === data.eventId);
    const meeting = meetings.find((m) => m.id === data.eventId);

    if (timeEntry) {
      updateTimeEntry.mutate({
        id: data.eventId,
        updates: {
          startTime: data.startTime,
          endTime: data.endTime,
          durationMinutes: data.durationMinutes,
        },
      });
    } else if (meeting) {
      updateMeeting.mutate({
        id: data.eventId,
        updates: {
          startTime: data.startTime,
          endTime: data.endTime,
          durationMinutes: data.durationMinutes,
        },
        originalMeeting: meeting,
      });
    }
  }, [timeEntries, meetings, updateTimeEntry, updateMeeting]);

  // Handle event move on calendar (drag to different time/day)
  const handleEventMove = useCallback((data: { eventId: string; scheduledDate: string; startTime: string; endTime: string; durationMinutes: number }) => {
    // Check if this is a time entry or a meeting
    const timeEntry = timeEntries.find((e) => e.id === data.eventId);
    const meeting = meetings.find((m) => m.id === data.eventId);

    if (timeEntry) {
      updateTimeEntry.mutate({
        id: data.eventId,
        updates: {
          scheduledDate: data.scheduledDate,
          startTime: data.startTime,
          endTime: data.endTime,
          durationMinutes: data.durationMinutes,
        },
      });
    } else if (meeting) {
      updateMeeting.mutate({
        id: data.eventId,
        updates: {
          scheduledDate: data.scheduledDate,
          startTime: data.startTime,
          endTime: data.endTime,
          durationMinutes: data.durationMinutes,
        },
        originalMeeting: meeting,
      });
    }
  }, [timeEntries, meetings, updateTimeEntry, updateMeeting]);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === "task") {
      // Use taskId to find the parent task for editing
      const taskId = event.taskId || event.id;
      const task = tasks.find((t) => t.id === taskId);
      if (task) openEditTaskModal(task);
    } else {
      const meeting = meetings.find((m) => m.id === event.id);
      if (meeting) openEditMeetingModal(meeting);
    }
  };

  // Convert time entries and meetings to calendar events
  const events = useMemo((): CalendarEvent[] => {
    // Build task events from time entries
    const taskEvents: CalendarEvent[] = timeEntries
      .filter((entry) => tasks.some((t) => t.id === entry.taskId))
      .map((entry) => {
        const task = tasks.find((t) => t.id === entry.taskId)!;
        const category = taskCategories.find((c) => c.id === task.categoryId);
        return {
          id: entry.id,
          taskId: entry.taskId,
          title: task.title,
          type: "task" as const,
          categoryColor: category?.color || "development",
          scheduledDate: entry.scheduledDate,
          startTime: entry.startTime,
          endTime: entry.endTime,
          durationMinutes: entry.durationMinutes,
        };
      });

    // Fallback: include tasks with time fields that don't have time entries yet (backward compat)
    const taskIdsWithEntries = new Set(timeEntries.map((e) => e.taskId));
    const legacyTaskEvents: CalendarEvent[] = tasks
      .filter((task) => task.startTime && task.endTime && task.scheduledDate && !taskIdsWithEntries.has(task.id))
      .map((task) => {
        const category = taskCategories.find((c) => c.id === task.categoryId);
        return {
          id: task.id,
          taskId: task.id,
          title: task.title,
          type: "task" as const,
          categoryColor: category?.color || "development",
          scheduledDate: task.scheduledDate!,
          startTime: task.startTime!,
          endTime: task.endTime!,
          durationMinutes: task.durationMinutes || 60,
        };
      });

    const meetingEvents: CalendarEvent[] = meetings.map((meeting) => {
      const category = meetingCategories.find((c) => c.id === meeting.categoryId);
      return {
        id: meeting.id,
        title: meeting.title,
        type: "meeting" as const,
        categoryColor: category?.color || "development",
        scheduledDate: meeting.scheduledDate,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        durationMinutes: meeting.durationMinutes,
        attendees: meeting.attendees,
        isAllDay: meeting.isAllDay,
      };
    });

    return [...taskEvents, ...legacyTaskEvents, ...meetingEvents];
  }, [tasks, timeEntries, meetings, taskCategories, meetingCategories]);

  return (
    <div className="flex flex-col h-full">
      <CalendarHeader />
      <DayHeaders days={days} />
      <CalendarGrid days={days} events={events} onEventClick={handleEventClick} onDragCreate={handleDragCreate} onEventResize={handleEventResize} onEventMove={handleEventMove} />
    </div>
  );
}
