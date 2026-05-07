/**
 * ISyncService
 *
 * Interface contract for all real-time broadcast service implementations.
 * Any class that extends this must implement the `broadcastUpdate` method.
 */
class ISyncService {
  /**
   * Broadcasts a schedule update to all connected clients in a workspace.
   *
   * @param {string} workspaceId - The ID of the workspace channel to broadcast to.
   * @param {Object} payload     - The event payload (e.g., the new schedule state).
   */
  async broadcastUpdate(workspaceId, payload) {
    throw new Error("Method 'broadcastUpdate()' must be implemented.");
  }
}

export default ISyncService;
