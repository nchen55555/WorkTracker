import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  differenceInMinutes,
} from "date-fns";

import type { CalendarViewMode } from "@/stores/calendarStore";

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getViewDays(date: Date, viewMode: CalendarViewMode): Date[] {
  if (viewMode === "week") {
    return getWeekDays(date);
  }

  const numDays = viewMode === "5days" ? 5 : 3;
  const days: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    days.push(addDays(date, i));
  }
  return days;
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy");
}

export function formatDayName(date: Date): string {
  return format(date, "EEE").toUpperCase();
}

export function formatDayNumber(date: Date): string {
  return format(date, "d");
}

export function formatTime(time: string): string {
  // Convert "14:00" to "2 PM"
  const [hours] = time.split(":");
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour} ${period}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = minutes / 60;
  if (hours === Math.floor(hours)) {
    return `${hours}h`;
  }
  return `${hours.toFixed(1)}h`;
}

export function formatDayDateTime(date: string, time?: string): string {
  const d = parseISO(date);
  // Format as "Mon, Mar 10"
  const dayDate = format(d, "EEE, MMM d");

  if (!time) {
    return dayDate;
  }

  // Format as "Mon, Mar 10 9:00am" (12-hour format)
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const formattedTime = `${displayHour}:${minutes}${period}`;
  return `${dayDate} ${formattedTime}`;
}

export function formatTimeSimple(time: string): string {
  // Format as "9:00am" or "2:30pm" (12-hour format)
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes}${period}`;
}

export function formatRecurringDay(startDay: string, endDay?: string): string {
  if (endDay && startDay !== endDay) {
    return `${startDay} - ${endDay}`;
  }
  return startDay;
}

export function getTimeSlotPosition(time: string, startHour: number = 0): number {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = (hours - startHour) * 60 + minutes;
  return (totalMinutes / 60) * 60; // 60px per hour
}

export function getEventHeight(durationMinutes: number): number {
  return (durationMinutes / 60) * 60; // 60px per hour
}

export function calculateDuration(startTime: string, endTime: string): number {
  const start = parseISO(`2000-01-01T${startTime}`);
  const end = parseISO(`2000-01-01T${endTime}`);
  return differenceInMinutes(end, start);
}

/**
 * Snap minutes to nearest increment (e.g., 15-minute intervals)
 */
export function snapToIncrement(minutes: number, increment: number = 15): number {
  return Math.round(minutes / increment) * increment;
}

/**
 * Convert Y pixel position to time string (HH:MM)
 * @param y - Y position in pixels (60px = 1 hour)
 * @param snapMinutes - Snap to this increment (default 15 minutes)
 * @param startHour - The hour that corresponds to y=0 (default 0)
 */
export function pixelToTime(y: number, snapMinutes: number = 15, startHour: number = 0): string {
  // Convert pixels to total minutes (60px = 60 minutes = 1 hour)
  const totalMinutes = y + (startHour * 60);

  // Snap to nearest increment
  const snappedMinutes = snapToIncrement(totalMinutes, snapMinutes);

  // Clamp to valid range (0:00 - 23:59)
  const clampedMinutes = Math.max(0, Math.min(snappedMinutes, 24 * 60 - 1));

  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Calculate end time from start time and duration
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const clampedMinutes = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
  const newHours = Math.floor(clampedMinutes / 60);
  const newMins = clampedMinutes % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
}

export { isToday, addWeeks, subWeeks, addDays, subDays, startOfWeek };
