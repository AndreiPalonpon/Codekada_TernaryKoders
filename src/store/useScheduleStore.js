import { create } from "zustand";

/**
 * Helper to map database-scheduled tasks to FullCalendar-compatible event objects.
 */
const mapScheduledToCalendarEvents = (scheduledTasks) => {
  const events = [];
  const loadColors = {
    High:   { bg: '#ef4444', border: '#b91c1c' }, // red for High load
    Medium: { bg: '#3b82f6', border: '#2563eb' }, // blue for Medium load
    Low:    { bg: '#10b981', border: '#059669' }, // emerald for Low load
  };

  for (const task of scheduledTasks) {
    const color = loadColors[task.metadata.cognitive_load] || loadColors.Medium;

    for (const block of task.schedule_blocks) {
      events.push({
        id: task._id || `task_${Date.now()}_${events.length}`,
        title: task.metadata.task_name,
        start: block.start_time,
        end: block.end_time,
        backgroundColor: color.bg,
        borderColor: color.border,
        extendedProps: {
          description: `<p>Scheduled by SyncForge mathematical scheduler.</p>`,
          cognitive_load: task.metadata.cognitive_load,
          assigned_to: task.assigned_to || 'Current User',
        },
      });
    }
  }
  return events;
};

/**
 * useScheduleStore
 *
 * Central Zustand store managing the front-end scheduling state.
 * Bridges input, parsing, scheduling, calendar rendering, and authentication.
 */
const useScheduleStore = create((set, get) => ({

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  events: [],
  parsedTasks: [],
  textInput: "",
  workspaceId: null,
  userId: null,
  isAnalyzing: false,
  isScheduling: false,
  isLoading: false, // Backward compatibility
  error: null,

  // Auth Session State
  user: null,
  isLoggedIn: false,

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Check if a user session exists in localStorage (hydration safety check) */
  checkAuth: () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("syncforge_user");
      if (stored) {
        const userProfile = JSON.parse(stored);
        set({ user: userProfile, isLoggedIn: true });
        return true;
      }
    }
    return false;
  },

  /** Login or Create a fresh account */
  loginUser: async (name, email, password, isSignUp = false) => {
    set({ isLoading: true, error: null });
    try {
      // Create user session object
      const userProfile = { 
        name: isSignUp ? name : (name || "SmartyToonster"), 
        email 
      };
      
      if (typeof window !== "undefined") {
        localStorage.setItem("syncforge_user", JSON.stringify(userProfile));
      }
      
      set({ user: userProfile, isLoggedIn: true });
      return true;
    } catch (err) {
      set({ error: { code: "AUTH_FAILED", message: err.message } });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  /** Log out and clear session state */
  logoutUser: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("syncforge_user");
    }
    set({ 
      user: null, 
      isLoggedIn: false, 
      events: [], 
      parsedTasks: [], 
      workspaceId: null, 
      userId: null,
      textInput: "" 
    });
  },

  /** Update the raw text input bound to the <textarea>. */
  setTextInput: (value) => set({ textInput: value }),

  /**
   * Initializes a real workspace and user in MongoDB for the current session.
   * This provides valid ObjectIds for all downstream API calls.
   */
  initWorkspace: async (forcedWorkspaceId = null, forcedUserId = null) => {
    if (forcedWorkspaceId) {
      set({
        workspaceId: forcedWorkspaceId,
        userId: forcedUserId || get().userId,
      });
      console.log(`[SyncForge] Workspace initialized from param: ${forcedWorkspaceId}`);
      return;
    }

    // If already initialized, avoid calling the helper again.
    if (get().workspaceId) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/test-helpers/setup-workspace", {
        method: "POST"
      });
      const result = await response.json();

      if (response.ok && result.workspaceId) {
        set({
          workspaceId: result.workspaceId,
          userId: result.userId,
        });
        console.log(`[SyncForge] Workspace initialized: ${result.workspaceId}`);
      } else {
        set({
          error: {
            code: "INIT_FAILED",
            message: result.error || "Failed to initialize active workspace.",
          }
        });
      }
    } catch (err) {
      set({
        error: {
          code: "INIT_NETWORK_ERROR",
          message: err.message || "Failed to reach workspace setup server.",
        }
      });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Phase 1: Call Gemini/Gemma AI parser to generate structured tasks from the raw prompt.
   * Updates `parsedTasks` for verification in the TaskBreakdown UI table.
   */
  analyzePrompt: async () => {
    const { textInput, workspaceId, userId } = get();

    // Ensure workspace is initialized first.
    if (!workspaceId) {
      await get().initWorkspace();
    }

    const activeWorkspaceId = get().workspaceId;
    const activeUserId = get().userId;

    set({ isAnalyzing: true, error: null, isLoading: true });

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          assigned_to: activeUserId,
          text_prompt: textInput,
          user_preferences: {
            preferred_window: "Morning",
            deep_work_max_minutes: 240,
            buffer_minutes: 15,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        set({ parsedTasks: result.data.tasks || [] });
      } else {
        set({ error: result.error });
      }
    } catch (networkError) {
      set({
        error: {
          code: "ANALYSIS_ERROR",
          message: networkError.message || "Failed to reach AI parsing server.",
        },
      });
    } finally {
      set({ isAnalyzing: false, isLoading: false });
    }
  },

  /**
   * Phase 2: Post the AI-parsed tasks to the database-persisted scheduler.
   * Persists them in MongoDB, runs bin-packing, and renders events on FullCalendar.
   */
  generateSchedule: async () => {
    const { parsedTasks, workspaceId, userId } = get();

    if (!workspaceId) {
      set({ error: { code: "NO_WORKSPACE", message: "No active workspace is loaded." } });
      return;
    }

    if (!parsedTasks || parsedTasks.length === 0) {
      set({ error: { code: "NO_TASKS", message: "Please analyze a prompt to generate tasks first." } });
      return;
    }

    set({ isScheduling: true, error: null, isLoading: true });

    try {
      const response = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          tasks: parsedTasks,
          busy_blocks: [{ busy: [] }],
          triggered_by: userId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const scheduledTasks = result.data.scheduled || [];
        const mappedEvents = mapScheduledToCalendarEvents(scheduledTasks);
        set({ events: mappedEvents });
        console.log(`[SyncForge] Scheduled ${scheduledTasks.length} tasks successfully.`);
      } else {
        set({ error: result.error });
      }
    } catch (networkError) {
      set({
        error: {
          code: "SCHEDULING_ERROR",
          message: networkError.message || "Failed to reach the scheduling server.",
        },
      });
    } finally {
      set({ isScheduling: false, isLoading: false });
    }
  },
}));

export default useScheduleStore;
