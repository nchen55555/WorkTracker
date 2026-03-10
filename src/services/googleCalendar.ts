import type { Meeting } from "@/types";
import type { GoogleCalendar } from "@/stores/googleCalendarStore";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleCalendarListItem {
  id: string;
  summary: string;
  backgroundColor: string;
  selected?: boolean;
  primary?: boolean;
  accessRole: string;
}

interface GoogleCalendarListResponse {
  items: GoogleCalendarListItem[];
}

export async function fetchGoogleCalendarList(
  accessToken: string
): Promise<GoogleCalendar[]> {
  console.log("[GoogleCalendar] Fetching calendar list...");
  console.log("[GoogleCalendar] Token length:", accessToken?.length);

  let response: Response;
  try {
    response = await fetch(
      `${GOOGLE_CALENDAR_API}/users/me/calendarList`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log("[GoogleCalendar] Response status:", response.status);
  } catch (fetchError) {
    console.error("[GoogleCalendar] Fetch error:", fetchError);
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : "Failed to connect"}`);
  }

  if (response.status === 401) {
    throw new Error("GOOGLE_TOKEN_EXPIRED");
  }

  if (response.status === 403) {
    const error = await response.json();
    const message = error.error?.message || "Insufficient permissions";
    throw new Error(`403 Forbidden: ${message}. Please revoke app access in your Google Account and reconnect.`);
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch calendar list");
  }

  const data: GoogleCalendarListResponse = await response.json();

  // Include all calendars except freeBusyReader (which can't see event details)
  return (data.items || [])
    .filter((cal) => cal.accessRole !== "freeBusyReader")
    .map((cal) => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor,
      selected: cal.primary || false, // Primary calendar selected by default
    }));
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
  hangoutLink?: string;
  status: string;
  calendarId?: string; // Added to track which calendar this event came from
}

interface GoogleEventsResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const allEvents: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  // URL encode the calendar ID (important for email-based calendar IDs)
  const encodedCalendarId = encodeURIComponent(calendarId);

  do {
    const params = new URLSearchParams({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendarId}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      throw new Error("GOOGLE_TOKEN_EXPIRED");
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch calendar events");
    }

    const data: GoogleEventsResponse = await response.json();
    const events = (data.items || []).filter((event) => event.status !== "cancelled");
    allEvents.push(...events);

    pageToken = data.nextPageToken;
  } while (pageToken);

  return allEvents;
}

// Fetch events from multiple calendars
export async function fetchEventsFromCalendars(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const allEvents: GoogleCalendarEvent[] = [];

  for (const calendarId of calendarIds) {
    try {
      const events = await fetchGoogleCalendarEvents(
        accessToken,
        calendarId,
        timeMin,
        timeMax
      );
      // Add calendarId to each event so we know which calendar it came from
      const eventsWithCalendarId = events.map((event) => ({
        ...event,
        calendarId,
      }));
      allEvents.push(...eventsWithCalendarId);
    } catch (error) {
      // Re-throw token expiration errors so they can be handled at a higher level
      if (error instanceof Error && error.message === "GOOGLE_TOKEN_EXPIRED") {
        throw error;
      }
      console.error(`Failed to fetch events from calendar ${calendarId}:`, error);
      // Continue with other calendars for non-auth errors
    }
  }

  return allEvents;
}

// Convert a Meeting to Google Calendar event format
export function mapMeetingToGoogleEvent(
  meeting: Partial<Meeting>
): Partial<GoogleCalendarEvent> {
  const isAllDay = meeting.isAllDay || false;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (isAllDay) {
    // All-day events use date format (no time)
    return {
      summary: meeting.title,
      description: meeting.description,
      location: meeting.location,
      start: { date: meeting.scheduledDate },
      end: { date: meeting.endDate || meeting.scheduledDate },
    };
  }

  // Timed events use dateTime format
  const startDateTime = `${meeting.scheduledDate}T${meeting.startTime}:00`;
  const endDateTime = `${meeting.scheduledDate}T${meeting.endTime}:00`;

  return {
    summary: meeting.title,
    description: meeting.description,
    location: meeting.location,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
  };
}

// Update an existing event in Google Calendar
export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  meeting: Partial<Meeting>
): Promise<GoogleCalendarEvent> {
  const encodedCalendarId = encodeURIComponent(calendarId);
  const encodedEventId = encodeURIComponent(eventId);

  const eventData = mapMeetingToGoogleEvent(meeting);

  console.log("Google Calendar API - Updating event:", {
    calendarId,
    eventId,
    eventData,
    url: `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendarId}/events/${encodedEventId}`,
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendarId}/events/${encodedEventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    }
  );

  if (response.status === 401) {
    console.log("Google Calendar API - Token expired");
    throw new Error("GOOGLE_TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const error = await response.json();
    console.error("Google Calendar API - Error:", error);
    throw new Error(error.error?.message || "Failed to update calendar event");
  }

  const result = await response.json();
  console.log("Google Calendar API - Update successful:", result);
  return result;
}

// Create a new event in Google Calendar
export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  meeting: Partial<Meeting>
): Promise<GoogleCalendarEvent> {
  const encodedCalendarId = encodeURIComponent(calendarId);
  const eventData = mapMeetingToGoogleEvent(meeting);

  console.log("Google Calendar API - Creating event:", {
    calendarId,
    eventData,
    url: `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendarId}/events`,
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendarId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    }
  );

  if (response.status === 401) {
    console.log("Google Calendar API - Token expired");
    throw new Error("GOOGLE_TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const error = await response.json();
    console.error("Google Calendar API - Error:", error);
    throw new Error(error.error?.message || "Failed to create calendar event");
  }

  const result = await response.json();
  console.log("Google Calendar API - Create successful:", result);
  return result;
}

// Delete an event from Google Calendar
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const encodedCalendarId = encodeURIComponent(calendarId);
  const encodedEventId = encodeURIComponent(eventId);

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendarId}/events/${encodedEventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 401) {
    throw new Error("GOOGLE_TOKEN_EXPIRED");
  }

  // 204 No Content is success for DELETE
  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to delete calendar event");
  }
}

export function mapGoogleEventToMeeting(
  event: GoogleCalendarEvent
): Omit<Meeting, "id" | "categoryId"> {
  // All-day events have `date` instead of `dateTime`
  const isAllDay = !event.start.dateTime && !!event.start.date;

  const startDateTime = event.start.dateTime
    ? new Date(event.start.dateTime)
    : new Date(event.start.date + "T00:00:00");
  const endDateTime = event.end.dateTime
    ? new Date(event.end.dateTime)
    : new Date(event.end.date + "T23:59:59");

  // Use local timezone for date extraction to match the time extraction
  // This prevents date shifting when events are near midnight
  const scheduledDate = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, "0")}-${String(startDateTime.getDate()).padStart(2, "0")}`;
  const startTime = isAllDay ? "00:00" : `${String(startDateTime.getHours()).padStart(2, "0")}:${String(startDateTime.getMinutes()).padStart(2, "0")}`;
  const endTime = isAllDay ? "23:59" : `${String(endDateTime.getHours()).padStart(2, "0")}:${String(endDateTime.getMinutes()).padStart(2, "0")}`;
  const durationMinutes = isAllDay
    ? 1440 // 24 hours
    : Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000);

  return {
    title: event.summary || "(No title)",
    description: event.description,
    scheduledDate,
    startTime,
    endTime,
    durationMinutes,
    attendees: event.attendees?.map((a) => a.displayName || a.email),
    location: event.location,
    meetingLink: event.hangoutLink,
    isFromGoogle: true,
    googleEventId: event.id,
    isAllDay,
    isCompleted: false,
    isArchived: false,
  };
}
