import { useMemo, useCallback } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { DayHeaders } from "./DayHeaders";
import { CalendarGrid } from "./CalendarGrid";
import { useCalendarStore } from "@/stores/calendarStore";
import { useModalStore, type CreateEventInitialData } from "@/stores/modalStore";
import { useViewStore } from "@/stores/viewStore";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useMeetings, useUpdateMeeting } from "@/hooks/useMeetings";
import { useCategories } from "@/hooks/useCategories";
import { getViewDays } from "@/utils/dates";
import type { CalendarEvent } from "@/types";

export function WeeklyCalendar() {
  const { currentDate, viewMode } = useCalendarStore();
  const { openEditTaskModal, openEditMeetingModal, openCreateTaskModal, openCreateMeetingModal } = useModalStore();
  const { activeView } = useViewStore();
  const { data: tasks = [] } = useTasks();
  const { data: meetings = [] } = useMeetings();
  const { data: taskCategories = [] } = useCategories("task");
  const { data: meetingCategories = [] } = useCategories("meeting");
  const updateTask = useUpdateTask();
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
    // Find if this is a task or meeting
    const task = tasks.find((t) => t.id === data.eventId);
    const meeting = meetings.find((m) => m.id === data.eventId);

    if (task) {
      updateTask.mutate({
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
  }, [tasks, meetings, updateTask, updateMeeting]);

  // Handle event move on calendar (drag to different time/day)
  const handleEventMove = useCallback((data: { eventId: string; scheduledDate: string; startTime: string; endTime: string; durationMinutes: number }) => {
    // Find if this is a task or meeting
    const task = tasks.find((t) => t.id === data.eventId);
    const meeting = meetings.find((m) => m.id === data.eventId);

    if (task) {
      updateTask.mutate({
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
  }, [tasks, meetings, updateTask, updateMeeting]);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === "task") {
      const task = tasks.find((t) => t.id === event.id);
      if (task) openEditTaskModal(task);
    } else {
      const meeting = meetings.find((m) => m.id === event.id);
      if (meeting) openEditMeetingModal(meeting);
    }
  };

  // Convert tasks and meetings to calendar events
  // Only include tasks/meetings that have explicit times set
  const events = useMemo((): CalendarEvent[] => {
    // Only get tasks with explicitly scheduled times
    const taskEvents: CalendarEvent[] = tasks
      .filter((task) => task.startTime && task.endTime && task.scheduledDate)
      .map((task) => {
        const category = taskCategories.find((c) => c.id === task.categoryId);
        return {
          id: task.id,
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

    return [...taskEvents, ...meetingEvents];
  }, [tasks, meetings, taskCategories, meetingCategories]);

  return (
    <div className="flex flex-col h-full">
      <CalendarHeader />
      <DayHeaders days={days} />
      <CalendarGrid days={days} events={events} onEventClick={handleEventClick} onDragCreate={handleDragCreate} onEventResize={handleEventResize} onEventMove={handleEventMove} />
    </div>
  );
}
