import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/services/supabase";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/services/googleCalendar";
import { useGoogleCalendarStore } from "@/stores/googleCalendarStore";
import { refreshGoogleToken } from "@/services/tokenRefresh";
import type { Meeting } from "@/types";

// Local storage key for offline mode
const MEETINGS_STORAGE_KEY = "worktracker_meetings";

function getLocalMeetings(): Meeting[] {
  const stored = localStorage.getItem(MEETINGS_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Start with empty meetings - user creates their own
  return [];
}

function saveLocalMeetings(meetings: Meeting[]) {
  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetings));
}

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: async (): Promise<Meeting[]> => {
      if (!isSupabaseConfigured() || !supabase) {
        return getLocalMeetings();
      }

      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      return data.map((meeting) => ({
        id: meeting.id,
        categoryId: meeting.category_id || undefined,
        title: meeting.title,
        description: meeting.description || undefined,
        scheduledDate: meeting.scheduled_date,
        endDate: meeting.end_date || undefined,
        startTime: meeting.start_time,
        endTime: meeting.end_time,
        durationMinutes: meeting.duration_minutes || 60,
        attendees: meeting.attendees || undefined,
        location: meeting.location || undefined,
        meetingLink: meeting.meeting_link || undefined,
        isFromGoogle: meeting.is_from_google,
        googleEventId: meeting.google_event_id || undefined,
        googleCalendarId: meeting.google_calendar_id || undefined,
        isAllDay: meeting.is_all_day || false,
        isCompleted: meeting.is_completed || false,
        isArchived: meeting.is_archived || false,
      }));
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Meeting> & { title: string }) => {
      const today = new Date().toISOString().split("T")[0];

      // Check if Supabase is configured and user is authenticated
      if (isSupabaseConfigured() && supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Get a valid category ID - either use provided one or fetch the first available
          let validCategoryId = input.categoryId;
          let googleCalendarId: string | null = null;

          // If categoryId looks like a local ID (not a UUID), fetch a real one
          if (!validCategoryId || !validCategoryId.includes("-")) {
            const { data: categories } = await supabase
              .from("categories")
              .select("id, google_calendar_id")
              .eq("type", "meeting")
              .limit(1);

            if (categories && categories.length > 0) {
              validCategoryId = categories[0].id;
              googleCalendarId = categories[0].google_calendar_id;
            } else {
              throw new Error("No meeting categories available. Please create a category first.");
            }
          } else {
            // Fetch the google_calendar_id for the selected category
            const { data: category } = await supabase
              .from("categories")
              .select("google_calendar_id")
              .eq("id", validCategoryId)
              .single();

            if (category) {
              googleCalendarId = category.google_calendar_id;
            }
          }

          // Prepare meeting data
          const meetingData = {
            title: input.title,
            description: input.description,
            scheduledDate: input.scheduledDate || today,
            endDate: input.endDate,
            startTime: input.startTime || "09:00",
            endTime: input.endTime || "10:00",
            durationMinutes: input.durationMinutes || 60,
            isAllDay: input.isAllDay || false,
          };

          let googleEventId: string | null = null;
          let isFromGoogle = false;

          // Try to create in Google Calendar if we have a linked calendar
          if (googleCalendarId) {
            // Find the account that owns this calendar
            const accounts = useGoogleCalendarStore.getState().accounts;
            const account = accounts.find(acc =>
              acc.calendars.some(cal => cal.id === googleCalendarId)
            );

            if (account?.accessToken) {
              const createInGoogle = async (accessToken: string) => {
                const googleEvent = await createGoogleCalendarEvent(
                  accessToken,
                  googleCalendarId,
                  meetingData
                );
                return googleEvent;
              };

              try {
                const googleEvent = await createInGoogle(account.accessToken);
                googleEventId = googleEvent.id;
                isFromGoogle = true;
                console.log("Created event in Google Calendar:", googleEvent.id);
              } catch (err) {
                // If token expired, try to refresh and retry
                if (err instanceof Error && err.message === "GOOGLE_TOKEN_EXPIRED") {
                  const refreshed = await refreshGoogleToken();
                  if (refreshed) {
                    // Re-fetch the account after token refresh
                    const refreshedAccounts = useGoogleCalendarStore.getState().accounts;
                    const refreshedAccount = refreshedAccounts.find(acc => acc.id === account.id);
                    if (refreshedAccount?.accessToken) {
                      try {
                        const googleEvent = await createInGoogle(refreshedAccount.accessToken);
                        googleEventId = googleEvent.id;
                        isFromGoogle = true;
                        console.log("Created event in Google Calendar after token refresh:", googleEvent.id);
                      } catch (retryErr) {
                        console.warn("Failed to create in Google Calendar after refresh:", retryErr);
                      }
                    }
                  }
                } else {
                  console.warn("Failed to create in Google Calendar:", err);
                }
              }
            }
          }

          const newMeetingId = crypto.randomUUID();
          const { data, error } = await supabase
            .from("meetings")
            .insert({
              id: newMeetingId,
              user_id: user.id,
              category_id: validCategoryId,
              title: input.title,
              description: input.description,
              scheduled_date: meetingData.scheduledDate,
              end_date: input.endDate,
              start_time: meetingData.startTime,
              end_time: meetingData.endTime,
              duration_minutes: meetingData.durationMinutes,
              is_all_day: meetingData.isAllDay,
              is_from_google: isFromGoogle,
              google_event_id: googleEventId,
              google_calendar_id: googleCalendarId,
            })
            .select()
            .single();

          if (error) throw error;

          return {
            id: data.id,
            categoryId: data.category_id,
            title: data.title,
            description: data.description,
            scheduledDate: data.scheduled_date,
            endDate: data.end_date,
            startTime: data.start_time,
            endTime: data.end_time,
            durationMinutes: data.duration_minutes,
            isAllDay: data.is_all_day,
            isFromGoogle: data.is_from_google,
            googleEventId: data.google_event_id,
            googleCalendarId: data.google_calendar_id,
          } as Meeting;
        }
      }

      // Fall back to localStorage
      const newMeeting: Meeting = {
        id: crypto.randomUUID(),
        categoryId: input.categoryId || "m1",
        title: input.title,
        description: input.description,
        scheduledDate: input.scheduledDate || today,
        endDate: input.endDate,
        startTime: input.startTime || "09:00",
        endTime: input.endTime || "10:00",
        durationMinutes: input.durationMinutes || 60,
        isAllDay: input.isAllDay || false,
        isFromGoogle: false,
        isCompleted: false,
        isArchived: false,
      };
      const meetings = getLocalMeetings();
      meetings.push(newMeeting);
      saveLocalMeetings(meetings);
      return newMeeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      originalMeeting,
    }: {
      id: string;
      updates: Partial<Meeting>;
      originalMeeting?: Meeting;
    }) => {
      if (!isSupabaseConfigured() || !supabase) {
        const meetings = getLocalMeetings();
        const index = meetings.findIndex((m) => m.id === id);
        if (index !== -1) {
          meetings[index] = { ...meetings[index], ...updates };
          saveLocalMeetings(meetings);
        }
        return meetings[index];
      }

      // Update Supabase first
      const { error } = await supabase
        .from("meetings")
        .update({
          category_id: updates.categoryId,
          title: updates.title,
          description: updates.description,
          scheduled_date: updates.scheduledDate,
          end_date: updates.endDate,
          start_time: updates.startTime,
          end_time: updates.endTime,
          duration_minutes: updates.durationMinutes,
          attendees: updates.attendees,
          location: updates.location,
          meeting_link: updates.meetingLink,
          is_all_day: updates.isAllDay,
          is_completed: updates.isCompleted,
          is_archived: updates.isArchived,
        })
        .eq("id", id);

      if (error) throw error;

      // If this meeting is from Google Calendar, sync the changes back
      console.log("Checking Google sync conditions:", {
        isFromGoogle: originalMeeting?.isFromGoogle,
        googleEventId: originalMeeting?.googleEventId,
        googleCalendarId: originalMeeting?.googleCalendarId,
      });

      if (originalMeeting?.isFromGoogle && originalMeeting.googleEventId && originalMeeting.googleCalendarId) {
        // Find the account that owns this calendar
        const accounts = useGoogleCalendarStore.getState().accounts;
        console.log("Available accounts:", accounts.map(a => ({
          id: a.id,
          email: a.email,
          hasToken: !!a.accessToken,
          calendars: a.calendars.map(c => c.id)
        })));

        let account = accounts.find(acc =>
          acc.calendars.some(cal => cal.id === originalMeeting.googleCalendarId)
        );

        // Fallback: if specific calendar not found, try to use any account with a token
        // This handles cases where calendars were renamed or the list changed
        if (!account?.accessToken) {
          console.log("Specific calendar not found, trying fallback to any account with token");
          account = accounts.find(acc => !!acc.accessToken);
        }

        console.log("Using account:", account ? {
          id: account.id,
          email: account.email,
          hasToken: !!account.accessToken
        } : "none");

        if (!account?.accessToken) {
          console.warn("No Google token available, skipping Google Calendar sync");
          return;
        }

        const syncToGoogle = async (accessToken: string) => {
          const mergedMeeting = { ...originalMeeting, ...updates };
          console.log("Syncing to Google Calendar:", {
            calendarId: originalMeeting.googleCalendarId,
            eventId: originalMeeting.googleEventId,
            meetingData: mergedMeeting,
          });
          await updateGoogleCalendarEvent(
            accessToken,
            originalMeeting.googleCalendarId!,
            originalMeeting.googleEventId!,
            mergedMeeting
          );
        };

        try {
          await syncToGoogle(account.accessToken);
          console.log("Successfully synced meeting update to Google Calendar");
        } catch (err) {
          if (err instanceof Error && err.message === "GOOGLE_TOKEN_EXPIRED") {
            const refreshed = await refreshGoogleToken();
            if (refreshed) {
              // Re-fetch the account after token refresh
              const refreshedAccounts = useGoogleCalendarStore.getState().accounts;
              const refreshedAccount = refreshedAccounts.find(acc => acc.id === account.id);
              if (refreshedAccount?.accessToken) {
                await syncToGoogle(refreshedAccount.accessToken);
                console.log("Successfully synced meeting update to Google Calendar after token refresh");
              }
            } else {
              console.error("Failed to refresh token for Google Calendar sync");
            }
          } else {
            console.error("Failed to sync meeting to Google Calendar:", err);
          }
        }
      } else {
        console.log("Skipping Google sync - conditions not met");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      meeting,
    }: {
      id: string;
      meeting?: Meeting;
    }) => {
      if (!isSupabaseConfigured() || !supabase) {
        const meetings = getLocalMeetings();
        saveLocalMeetings(meetings.filter((m) => m.id !== id));
        return;
      }

      // Delete from Supabase first
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;

      // If this meeting is from Google Calendar, delete it there too
      if (meeting?.isFromGoogle && meeting.googleEventId && meeting.googleCalendarId) {
        // Find the account that owns this calendar
        const accounts = useGoogleCalendarStore.getState().accounts;
        const account = accounts.find(acc =>
          acc.calendars.some(cal => cal.id === meeting.googleCalendarId)
        );

        if (!account?.accessToken) {
          console.warn("No Google token available, skipping Google Calendar delete");
          return;
        }

        const deleteFromGoogle = async (accessToken: string) => {
          await deleteGoogleCalendarEvent(
            accessToken,
            meeting.googleCalendarId!,
            meeting.googleEventId!
          );
        };

        try {
          await deleteFromGoogle(account.accessToken);
          console.log("Successfully deleted meeting from Google Calendar");
        } catch (err) {
          if (err instanceof Error && err.message === "GOOGLE_TOKEN_EXPIRED") {
            const refreshed = await refreshGoogleToken();
            if (refreshed) {
              // Re-fetch the account after token refresh
              const refreshedAccounts = useGoogleCalendarStore.getState().accounts;
              const refreshedAccount = refreshedAccounts.find(acc => acc.id === account.id);
              if (refreshedAccount?.accessToken) {
                await deleteFromGoogle(refreshedAccount.accessToken);
                console.log("Successfully deleted meeting from Google Calendar after token refresh");
              }
            } else {
              console.error("Failed to refresh token for Google Calendar delete");
            }
          } else {
            console.error("Failed to delete meeting from Google Calendar:", err);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteMultipleMeetings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;

      if (!isSupabaseConfigured() || !supabase) {
        const meetings = getLocalMeetings();
        saveLocalMeetings(meetings.filter((m) => !ids.includes(m.id)));
        return;
      }

      const { error } = await supabase.from("meetings").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useArchiveMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      if (!isSupabaseConfigured() || !supabase) {
        const meetings = getLocalMeetings();
        const index = meetings.findIndex((m) => m.id === id);
        if (index !== -1) {
          meetings[index] = { ...meetings[index], isArchived };
          saveLocalMeetings(meetings);
        }
        return meetings[index];
      }

      const { error } = await supabase
        .from("meetings")
        .update({ is_archived: isArchived })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useArchivedMeetings() {
  return useQuery({
    queryKey: ["meetings", "archived"],
    queryFn: async (): Promise<Meeting[]> => {
      if (!isSupabaseConfigured() || !supabase) {
        const meetings = getLocalMeetings();
        return meetings.filter((m) => m.isArchived);
      }

      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("is_archived", true)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;

      return data.map((meeting) => ({
        id: meeting.id,
        categoryId: meeting.category_id || undefined,
        title: meeting.title,
        description: meeting.description || undefined,
        scheduledDate: meeting.scheduled_date,
        endDate: meeting.end_date || undefined,
        startTime: meeting.start_time,
        endTime: meeting.end_time,
        durationMinutes: meeting.duration_minutes || 60,
        attendees: meeting.attendees || undefined,
        location: meeting.location || undefined,
        meetingLink: meeting.meeting_link || undefined,
        isFromGoogle: meeting.is_from_google,
        googleEventId: meeting.google_event_id || undefined,
        googleCalendarId: meeting.google_calendar_id || undefined,
        isAllDay: meeting.is_all_day || false,
        isCompleted: meeting.is_completed || false,
        isArchived: meeting.is_archived || false,
      }));
    },
  });
}
