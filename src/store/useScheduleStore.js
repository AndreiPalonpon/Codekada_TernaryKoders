import { create } from "zustand";

/**
 * useScheduleStore
 *
 * Central Zustand store bridging the MultimodalInput (writes textInput)
 * and CalendarView (reads events). The generateSchedule action POSTs
 * to the backend orchestrator and maps the response into FullCalendar-
 * compatible event objects.
 */
const useScheduleStore = create((set, get) => ({

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  events: [],
  textInput: "",
  isLoading: false,
  error: null,

  // ---------------------------------------------------------------------------
  // Actions
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
   * On success (result.success === true) the response data is mapped to
   * the `events` array. On failure the `error` state is populated.
   *
   * @param {string} workspaceId - Workspace identifier (default "ws_8f92a").
   */
  generateSchedule: async (workspaceId = "ws_8f92a") => {
    const { textInput } = get();

    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          inputs: [{ type: "text", content: textInput }],
          user_preferences: {
            deep_work_hours: ["09:00", "11:00"],
            max_daily_load_minutes: 240,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        set({ events: result.data });
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
}));

export default useScheduleStore;
