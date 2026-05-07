import { create } from "zustand";

/**
 * useScheduleStore
 *
 * Central Zustand store bridging the MultimodalInput (writes textInput)
 * and CalendarView (reads events). The generateSchedule action POSTs
 * to the backend orchestrator and maps the response into FullCalendar-
 * compatible event objects.
 *
 * Secondary actions handle recalculation (snooze, complete, delete)
 * and local UI state (filters, clearing).
 */
const useScheduleStore = create((set, get) => ({

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** FullCalendar-compatible event objects rendered on the calendar. */
  events: [],

  /** Raw text bound to the multimodal input textarea. */
  textInput: "",

  /** AI Phase 1 parsed task metadata (shown in TaskBreakdown table). */
  aiParsedTasks: [],

  /** True while the generation pipeline is running. */
  isLoading: false,

  /** True while a recalculation (snooze/complete/delete) is in progress. */
  isRecalculating: false,

  /** True while Google Calendar busy blocks are being fetched. */
  isSyncingGoogleCalendar: false,

  /** True while an app event is being written to Google Calendar. */
  isWritingGoogleCalendar: false,

  /** Error object from the last failed operation, or null. */
  error: null,

  /** Active cognitive-load filter: null = show all, or "High" | "Medium" | "Low". */
  activeFilter: null,

  // ---------------------------------------------------------------------------
  // Primary Actions
  // ---------------------------------------------------------------------------

  /** Update the raw text input bound to the <textarea>. */
  setTextInput: (value) => set({ textInput: value }),

  /**
   * Sends the current multimodal inputs to the backend generation pipeline.
   *
   * Payload follows the Internal API spec for POST /api/schedule/generate:
   *   - workspace_id  : target workspace
   *   - inputs        : array of { type, content } objects
   *   - user_preferences : MVP-hardcoded scheduling preferences
   *
   * On success the response populates both `events` (calendar) and
   * `aiParsedTasks` (TaskBreakdown table). On failure `error` is set.
   *
   * @param {string} workspaceId - Workspace identifier (default "ws_8f92a").
   */
  generateSchedule: async (workspaceId = "ws_8f92a") => {
    const { textInput, events } = get();
    const schedulableExistingEvents = events.filter(
      (event) => event.extendedProps?.source !== "google_calendar"
    );

    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          inputs: [{ type: "text", content: textInput }],
          existing_events: schedulableExistingEvents,
          user_preferences: {
            deep_work_hours: ["09:00", "17:00"],
            max_daily_load_minutes: 240,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        set((state) => ({
          events: [
            ...state.events.filter((event) => event.extendedProps?.source !== "google_calendar"),
            ...result.data,
          ],
          aiParsedTasks: [...state.aiParsedTasks, ...(result.meta?.ai_tasks || [])],
        }));
      } else {
        set({ error: result.error });
      }
    } catch (networkError) {
      set({
        error: {
          code: "NETWORK_ERROR",
          message: networkError.message || "Failed to reach the server.",
        },
      });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Fetches Google Calendar events and renders them as read-only FullCalendar
   * events. Generated tasks can then visually avoid those blocks.
   */
  syncGoogleCalendarBusy: async () => {
    set({ isSyncingGoogleCalendar: true, error: null });

    try {
      const response = await fetch("/api/calendar/events");
      const result = await response.json();

      if (!response.ok || !result.success) {
        const apiError = result.error || {
          code: "GOOGLE_CALENDAR_SYNC_FAILED",
          message: "Failed to sync Google Calendar.",
        };
        set({ error: apiError });
        return { success: false, error: apiError };
      }

      const googleEvents = (result.data?.events || []).map((event, index) => ({
        id: `gcal_event_${event.id || index}_${event.start}_${event.end}`,
        title: event.title || "(No title)",
        start: event.start,
        end: event.end,
        backgroundColor: "#94a3b8",
        borderColor: "#64748b",
        display: "block",
        extendedProps: {
          source: "google_calendar",
          readOnly: true,
          google_event_id: event.id,
          google_link: event.htmlLink,
          description: event.description
            ? `<p>${event.description}</p>`
            : "<p>Imported from Google Calendar.</p>",
        },
      }));

      set((state) => ({
        events: [
          ...state.events.filter((event) => event.extendedProps?.source !== "google_calendar"),
          ...googleEvents,
        ],
      }));

      return { success: true, busyCount: googleEvents.length };
    } catch (networkError) {
      const error = {
        code: "NETWORK_ERROR",
        message: networkError.message || "Failed to reach the server.",
      };
      set({ error });
      return { success: false, error };
    } finally {
      set({ isSyncingGoogleCalendar: false });
    }
  },

  /**
   * Writes a scheduled app event to the signed-in user's primary Google Calendar.
   * @param {Object} event - FullCalendar EventApi or compatible event object.
   */
  addEventToGoogleCalendar: async (event) => {
    set({ isWritingGoogleCalendar: true, error: null });

    const start = event.start instanceof Date ? event.start.toISOString() : event.start;
    const end = event.end instanceof Date ? event.end.toISOString() : event.end;

    try {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          description: event.extendedProps?.description || "",
          start,
          end,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const apiError = result.error || {
          code: "GOOGLE_CALENDAR_WRITE_FAILED",
          message: "Failed to add event to Google Calendar.",
        };
        set({ error: apiError });
        return { success: false, error: apiError };
      }

      const createdEvent = result.data?.event;

      set((state) => ({
        events: state.events.map((existingEvent) => {
          if (existingEvent.id !== event.id) return existingEvent;

          return {
            ...existingEvent,
            extendedProps: {
              ...existingEvent.extendedProps,
              exported_to_google_calendar: true,
              google_event_id: createdEvent?.id,
              google_link: createdEvent?.htmlLink,
            },
          };
        }),
      }));

      return { success: true, event: createdEvent };
    } catch (networkError) {
      const error = {
        code: "NETWORK_ERROR",
        message: networkError.message || "Failed to reach the server.",
      };
      set({ error });
      return { success: false, error };
    } finally {
      set({ isWritingGoogleCalendar: false });
    }
  },

  // ---------------------------------------------------------------------------
  // Secondary Actions (Recalculation / Task Mutations)
  // ---------------------------------------------------------------------------

  /**
   * Snoozes a task by pushing it forward by `delayMinutes`.
   * Calls PATCH /api/schedule/recalculate, then falls back to a local
   * optimistic removal if the backend is unavailable (MVP mode).
   *
   * @param {string} taskId       - The event ID to snooze.
   * @param {number} delayMinutes - Minutes to delay (default 30).
   */
  snoozeTask: async (taskId, delayMinutes = 30) => {
    set({ isRecalculating: true, error: null });

    try {
      const response = await fetch("/api/schedule/recalculate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: "ws_8f92a",
          interrupted_task_id: taskId,
          action: "snooze",
          delay_minutes: delayMinutes,
          busy_blocks: [{ busy: [] }],
          triggered_by: "user_mvp",
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.scheduled) {
        // Backend returned a fresh schedule — replace events.
        set({ events: result.data.scheduled });
      } else {
        // Optimistic local fallback: remove the snoozed event from the UI.
        const { events } = get();
        set({ events: events.filter((e) => e.id !== taskId) });
      }
    } catch {
      // Offline / no DB — optimistic local removal.
      const { events } = get();
      set({ events: events.filter((e) => e.id !== taskId) });
    } finally {
      set({ isRecalculating: false });
    }
  },

  /**
   * Marks a task as completed and removes it from the calendar.
   * @param {string} taskId - The event ID to complete.
   */
  markTaskComplete: async (taskId) => {
    set({ isRecalculating: true, error: null });

    try {
      await fetch("/api/schedule/recalculate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: "ws_8f92a",
          interrupted_task_id: taskId,
          action: "missed",          // Reuses "missed" to clear blocks; status updated locally.
          delay_minutes: 0,
          busy_blocks: [{ busy: [] }],
          triggered_by: "user_mvp",
        }),
      });
    } catch {
      // Best-effort — continue with optimistic removal below.
    }

    // Optimistic removal regardless of backend response.
    const { events } = get();
    set({
      events: events.filter((e) => e.id !== taskId),
      isRecalculating: false,
    });
  },

  /**
   * Deletes a task entirely from the calendar.
   * @param {string} taskId - The event ID to delete.
   */
  deleteTask: (taskId) => {
    const { events } = get();
    set({ events: events.filter((e) => e.id !== taskId) });
  },

  /**
   * Clears all events and AI-parsed tasks from the store.
   * Resets the schedule to a blank state.
   */
  clearSchedule: () => {
    set({ events: [], aiParsedTasks: [], error: null });
  },

  // ---------------------------------------------------------------------------
  // UI Filter Actions
  // ---------------------------------------------------------------------------

  /**
   * Sets the active cognitive-load filter.
   * @param {string|null} filterType - "High", "Medium", "Low", or null for all.
   */
  setFilter: (filterType) => set({ activeFilter: filterType }),

  /**
   * Returns the currently visible events, respecting the active filter.
   * Components should call this instead of reading `events` directly
   * when they need filtered results.
   */
  getFilteredEvents: () => {
    const { events, activeFilter } = get();
    if (!activeFilter) return events;
    return events.filter(
      (e) => e.extendedProps?.cognitive_load === activeFilter
    );
  },
}));

export default useScheduleStore;
