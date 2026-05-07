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

  /** Error object from the last failed operation, or null. */
  error: null,

  /** Active cognitive-load filter: null = show all, or "High" | "Medium" | "Low". */
  activeFilter: null,

  /** Dynamic user preferences for AI generation and Bin-Packing. */
  userPreferences: {
    exclude_times: [], // Array of string ranges, e.g., ["12:00-13:00"]
    exclude_days: [],  // Array of days, e.g., ["Saturday", "Sunday"]
    force_split_tasks: false,
    deep_work_hours: ["09:00", "17:00"],
    max_daily_load_minutes: 240,
  },

  // ---------------------------------------------------------------------------
  // Primary Actions
  // ---------------------------------------------------------------------------

  /** Update the raw text input bound to the <textarea>. */
  setTextInput: (value) => set({ textInput: value }),

  /** Update dynamic user preferences. */
  updatePreferences: (newPrefs) => set((state) => ({ 
    userPreferences: { ...state.userPreferences, ...newPrefs } 
  })),

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
   * @param {boolean} overwrite - If true, clears the calendar before appending.
   */
  generateSchedule: async (workspaceId = "ws_8f92a", overwrite = false) => {
    const { textInput, events, userPreferences } = get();

    set({ isLoading: true, error: null });

    // If overwriting, clear the events first so they aren't passed to the backend as busy blocks.
    const existingEvents = overwrite ? [] : events;

    try {
      const response = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          inputs: [{ type: "text", content: textInput }],
          existing_events: existingEvents,
          user_preferences: userPreferences,
        }),
      });

      const result = await response.json();

      if (result.success) {
        set((state) => ({
          events: overwrite ? result.data : [...state.events, ...result.data],
          aiParsedTasks: overwrite 
            ? (result.meta?.ai_tasks || []) 
            : [...state.aiParsedTasks, ...(result.meta?.ai_tasks || [])],
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
