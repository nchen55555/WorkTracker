import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGoogleCalendarStore } from "@/stores/googleCalendarStore";
import { supabase, isSupabaseConfigured } from "@/services/supabase";
import {
  fetchEventsFromCalendars,
  mapGoogleEventToMeeting,
} from "@/services/googleCalendar";
import { refreshGoogleTokenForAccount } from "@/services/tokenRefresh";
import type { GoogleAccount } from "@/types";

interface SyncResult {
  syncedCount: number;
  accountResults: { email: string; count: number; error?: string }[];
}

export function useGoogleCalendarSync() {
  const queryClient = useQueryClient();
  const { accounts, setSyncing, setAccountLastSync, setError } =
    useGoogleCalendarStore();

  return useMutation({
    mutationFn: async ({
      timeMin,
      timeMax,
    }: {
      timeMin: string;
      timeMax: string;
    }): Promise<SyncResult> => {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error("Supabase not configured");
      }

      // Capture non-null reference for use in callbacks
      const db = supabase;

      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (accounts.length === 0) {
        throw new Error(
          "No Google accounts connected. Please add a Google account first."
        );
      }

      const accountResults: SyncResult["accountResults"] = [];
      let totalSyncedCount = 0;

      // Process each account
      for (const account of accounts) {
        const selectedCalendars = account.calendars.filter((cal) => cal.selected);

        if (selectedCalendars.length === 0) {
          console.log(`Skipping account ${account.email}: no calendars selected`);
          continue;
        }

        try {
          const syncedCount = await syncAccountCalendars(
            db,
            user.id,
            account,
            selectedCalendars.map((c) => c.id),
            timeMin,
            timeMax
          );

          totalSyncedCount += syncedCount;
          accountResults.push({ email: account.email, count: syncedCount });
          setAccountLastSync(account.id, new Date().toISOString());
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          console.error(`Error syncing account ${account.email}:`, errorMsg);
          accountResults.push({ email: account.email, count: 0, error: errorMsg });
        }
      }

      if (totalSyncedCount === 0 && accountResults.every((r) => r.count === 0)) {
        const hasErrors = accountResults.some((r) => r.error);
        if (hasErrors) {
          throw new Error("Failed to sync calendars. Check account connections.");
        }
        throw new Error("No calendars selected. Please select at least one calendar to sync.");
      }

      console.log(`Total synced: ${totalSyncedCount} events from ${accountResults.length} accounts`);
      return { syncedCount: totalSyncedCount, accountResults };
    },
    onMutate: () => {
      setSyncing(true);
      setError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      setError(error.message);
    },
    onSettled: () => {
      setSyncing(false);
    },
  });

  async function syncAccountCalendars(
    db: NonNullable<typeof supabase>,
    userId: string,
    account: GoogleAccount,
    calendarIds: string[],
    timeMin: string,
    timeMax: string
  ): Promise<number> {
    let token = account.accessToken;

    console.log(`Syncing ${calendarIds.length} calendars for ${account.email}`);

    // Fetch events, with automatic token refresh on expiration
    let events;
    try {
      events = await fetchEventsFromCalendars(token, calendarIds, timeMin, timeMax);
    } catch (error) {
      if (error instanceof Error && error.message === "GOOGLE_TOKEN_EXPIRED") {
        console.log(`Token expired for ${account.email}, attempting refresh...`);

        const refreshed = await refreshGoogleTokenForAccount(account.id);
        if (!refreshed) {
          throw new Error(
            `Session expired for ${account.email}. Please reconnect this account.`
          );
        }

        // Get the new token from the store
        const store = useGoogleCalendarStore.getState();
        const updatedAccount = store.getAccount(account.id);
        if (!updatedAccount) {
          throw new Error("Account not found after token refresh");
        }

        token = updatedAccount.accessToken;
        console.log(`Token refreshed for ${account.email}, retrying sync...`);
        events = await fetchEventsFromCalendars(token, calendarIds, timeMin, timeMax);
      } else {
        throw error;
      }
    }

    console.log(`Fetched ${events.length} events for ${account.email}`);

    if (events.length === 0) {
      return 0;
    }

    // Get selected calendars with their names for category creation
    const selectedCalendars = account.calendars.filter((cal) => calendarIds.includes(cal.id));

    // Find or create a category for each Google Calendar
    const calendarToCategoryMap = new Map<string, string>();

    // Color rotation for new categories
    const colors = ["yellow", "orange", "coral", "pink", "purple", "blue", "teal", "green", "lime", "gray"] as const;

    // Fetch ALL existing meeting categories to determine color index
    const { data: allMeetingCategories } = await db
      .from("categories")
      .select("id, google_calendar_id, sort_order")
      .eq("user_id", userId)
      .eq("type", "meeting")
      .order("sort_order", { ascending: false });

    let colorIndex = (allMeetingCategories?.[0]?.sort_order ?? -1) + 1;

    // Build map from existing categories that are linked to Google Calendars
    for (const cat of allMeetingCategories || []) {
      if (cat.google_calendar_id) {
        calendarToCategoryMap.set(cat.google_calendar_id, cat.id);
        console.log(`[Sync] Found existing category for calendar: ${cat.google_calendar_id}`);
      }
    }

    console.log(`[Sync] Processing ${selectedCalendars.length} calendars, ${calendarToCategoryMap.size} already have categories`);

    // Create categories for calendars that don't have one yet
    // This MUST happen before we process events
    for (const calendar of selectedCalendars) {
      if (!calendarToCategoryMap.has(calendar.id)) {
        const newCategoryId = crypto.randomUUID();
        const categoryName = calendar.displayName || calendar.name;

        console.log(`[Sync] Creating new category "${categoryName}" for calendar ${calendar.id}`);

        const { error: insertError } = await db.from("categories").insert({
          id: newCategoryId,
          user_id: userId,
          name: categoryName,
          type: "meeting",
          color: colors[colorIndex % colors.length],
          google_calendar_id: calendar.id,
          sort_order: colorIndex,
        });

        if (!insertError) {
          calendarToCategoryMap.set(calendar.id, newCategoryId);
          colorIndex++;
          console.log(`[Sync] ✓ Created category "${categoryName}" (${newCategoryId}) for calendar ${calendar.id}`);
        } else {
          console.error(`[Sync] ✗ Failed to create category for calendar ${calendar.id}:`, insertError);

          // Try without google_calendar_id in case the column doesn't exist
          const fallbackCategoryId = crypto.randomUUID();
          const { error: fallbackError } = await db.from("categories").insert({
            id: fallbackCategoryId,
            user_id: userId,
            name: categoryName,
            type: "meeting",
            color: colors[colorIndex % colors.length],
            sort_order: colorIndex,
          });

          if (!fallbackError) {
            // Still map it locally for this sync session
            calendarToCategoryMap.set(calendar.id, fallbackCategoryId);
            colorIndex++;
            console.log(`[Sync] ✓ Created fallback category "${categoryName}" (without google_calendar_id link)`);
          } else {
            console.error(`[Sync] ✗ Failed to create fallback category:`, fallbackError);
          }
        }
      }
    }

    // Only create a generic fallback if we have NO categories at all
    let fallbackCategoryId: string | null = null;
    if (calendarToCategoryMap.size === 0) {
      const { data: anyCategory } = await db
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "meeting")
        .limit(1);

      if (anyCategory && anyCategory.length > 0) {
        fallbackCategoryId = anyCategory[0].id;
      } else {
        const newCategoryId = crypto.randomUUID();
        const { error: createError } = await db.from("categories").insert({
          id: newCategoryId,
          user_id: userId,
          name: "Meetings",
          type: "meeting",
          color: "blue",
          sort_order: 0,
        });
        if (!createError) {
          fallbackCategoryId = newCategoryId;
          console.log("[Sync] Created default Meetings category");
        }
      }
    }

    // Get all existing Google event IDs
    const googleEventIds = events.map((e) => e.id);
    const { data: existingMeetings } = await db
      .from("meetings")
      .select("id, google_event_id")
      .eq("user_id", userId)
      .in("google_event_id", googleEventIds);

    const existingMap = new Map(
      existingMeetings?.map((m) => [m.google_event_id, m.id]) || []
    );

    // Prepare batch operations
    const toInsert: Array<Record<string, unknown>> = [];
    const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];

    for (const event of events) {
      const meetingData = mapGoogleEventToMeeting(event);
      const existingId = existingMap.get(event.id);

      // Get category for this event's calendar
      let categoryId = event.calendarId
        ? calendarToCategoryMap.get(event.calendarId)
        : null;

      // If no category found for this calendar, log warning
      if (!categoryId && event.calendarId) {
        console.warn(`[Sync] No category found for calendar ${event.calendarId}, using fallback`);
        categoryId = fallbackCategoryId;
      } else if (!categoryId) {
        categoryId = fallbackCategoryId;
      }

      if (existingId) {
        // Note: We intentionally do NOT update category_id here
        // This preserves user's category assignments when re-syncing
        toUpdate.push({
          id: existingId,
          data: {
            title: meetingData.title,
            description: meetingData.description,
            scheduled_date: meetingData.scheduledDate,
            start_time: meetingData.startTime,
            end_time: meetingData.endTime,
            duration_minutes: meetingData.durationMinutes,
            attendees: meetingData.attendees,
            location: meetingData.location,
            meeting_link: meetingData.meetingLink,
            is_all_day: meetingData.isAllDay,
            google_calendar_id: event.calendarId,
          },
        });
      } else {
        toInsert.push({
          id: crypto.randomUUID(),
          user_id: userId,
          category_id: categoryId,
          title: meetingData.title,
          description: meetingData.description,
          scheduled_date: meetingData.scheduledDate,
          start_time: meetingData.startTime,
          end_time: meetingData.endTime,
          duration_minutes: meetingData.durationMinutes,
          attendees: meetingData.attendees,
          location: meetingData.location,
          meeting_link: meetingData.meetingLink,
          google_event_id: meetingData.googleEventId,
          google_calendar_id: event.calendarId,
          is_from_google: true,
          is_all_day: meetingData.isAllDay,
        });
      }
    }

    // Batch insert
    if (toInsert.length > 0) {
      const { error: insertError } = await db.from("meetings").insert(toInsert);
      if (insertError) console.error("Insert error:", insertError);
    }

    // Update existing
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map(({ id, data }) =>
          db.from("meetings").update(data).eq("id", id)
        )
      );
    }

    console.log(`${account.email}: Inserted ${toInsert.length}, updated ${toUpdate.length} meetings`);

    return events.length;
  }
}
