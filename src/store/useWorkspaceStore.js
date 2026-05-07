import { create } from "zustand";

/**
 * useWorkspaceStore
 *
 * Manages workspace/environment state for the SyncForge application.
 * Handles CRUD operations against POST /api/workspaces and maintains
 * the list of workspaces shown in the EnvironmentPicker and Sidebar.
 *
 * MVP Note: When MongoDB is not connected, workspaces are managed
 * entirely in-memory via optimistic local state.
 */
const useWorkspaceStore = create((set, get) => ({

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** Array of workspace objects: { id, name, type, color, iconName, createdAt }. */
  workspaces: [],

  /** The currently active workspace ID. */
  activeWorkspaceId: null,

  /** True while a workspace is being created via the API. */
  isCreating: false,

  /** True while workspaces are being fetched. */
  isFetching: false,

  /** Error object from the last failed operation, or null. */
  error: null,

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Sets the active workspace by ID.
   * @param {string|number} workspaceId
   */
  setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),

  /**
   * Fetches all workspaces from the backend.
   */
  fetchWorkspaces: async () => {
    set({ isFetching: true, error: null });
    try {
      const response = await fetch("/api/workspaces");
      const result = await response.json();
      if (result.success) {
        const fetchedWorkspaces = result.data || [];
        const currentActiveId = get().activeWorkspaceId;
        const newActiveId = currentActiveId || fetchedWorkspaces[0]?.id || null;
        set({ workspaces: fetchedWorkspaces, activeWorkspaceId: newActiveId });
      } else {
        set({ error: result.error });
      }
    } catch (err) {
      set({ 
        error: { code: 'FETCH_ERROR', message: err.message || "Failed to fetch workspaces." } 
      });
    } finally {
      set({ isFetching: false });
    }
  },

  /**
   * Creates a new workspace via the backend API.
   * Falls back to optimistic local creation if the API is unavailable.
   *
   * @param {string} name - Workspace name (e.g., "Hackathon Capstone").
   * @param {string} type - "Team Workspace" or "Personal".
   * @returns {Object|null} The created workspace object, or null on failure.
   */
  createWorkspace: async (name, type = "Personal", config = {}) => {
    set({ isCreating: true, error: null });

    // Color palette for new workspaces (cycles through options).
    const colorPalette = [
      "bg-emerald-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-cyan-500",
    ];
    const { workspaces } = get();
    const colorIndex = workspaces.length % colorPalette.length;

    const optimisticWorkspace = {
      id: `ws_${Date.now()}`,
      name,
      type,
      color: config.color || colorPalette[colorIndex],
      iconName: config.iconName || (type === "Team Workspace" ? "FolderKanban" : "CalendarDays"),
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_name: name,
          invited_user_emails: [],
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Use the server-generated ID if available.
        const serverWorkspace = {
          ...optimisticWorkspace,
          id: result.data._id || result.data.id || optimisticWorkspace.id,
        };

        set({
          workspaces: [...workspaces, serverWorkspace],
          activeWorkspaceId: serverWorkspace.id,
          isCreating: false,
        });
        return serverWorkspace;
      }
    } catch {
      // Backend unavailable — fall through to optimistic creation.
    }

    // Optimistic local fallback.
    set({
      workspaces: [...workspaces, optimisticWorkspace],
      activeWorkspaceId: optimisticWorkspace.id,
    });
    set({ isCreating: false });
    return optimisticWorkspace;
  },

  /**
   * Removes a workspace from the local store and backend database.
   * @param {string|number} workspaceId
   */
  removeWorkspace: async (workspaceId) => {
    const { workspaces, activeWorkspaceId } = get();
    const filtered = workspaces.filter((ws) => ws.id !== workspaceId);
    set({
      workspaces: filtered,
      activeWorkspaceId:
        activeWorkspaceId === workspaceId
          ? (filtered[0]?.id ?? null)
          : activeWorkspaceId,
    });

    try {
      await fetch(`/api/workspaces?id=${workspaceId}`, {
        method: "DELETE",
      });
    } catch {
      // Best-effort
    }
  },

  /**
   * Renames a workspace in local store and backend database.
   * @param {string} workspaceId
   * @param {string} newName
   */
  renameWorkspace: async (workspaceId, newName) => {
    const { workspaces } = get();
    set({
      workspaces: workspaces.map((w) =>
        w.id === workspaceId ? { ...w, name: newName } : w
      ),
    });

    try {
      await fetch("/api/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workspaceId, name: newName }),
      });
    } catch {
      // Best-effort
    }
  },

  /**
   * Sends a workspace invite (MVP: best-effort, no actual email sent).
   *
   * @param {string} workspaceId - Target workspace.
   * @param {string} email       - Email address to invite.
   * @returns {boolean} True if the invite was accepted (or simulated).
   */
  inviteMember: async (workspaceId, email) => {
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_name: `Invite to ${workspaceId}`,
          invited_user_emails: [email],
        }),
      });

      const result = await response.json();
      return result.success;
    } catch {
      // MVP fallback: simulate success.
      return true;
    }
  },
}));

export default useWorkspaceStore;
