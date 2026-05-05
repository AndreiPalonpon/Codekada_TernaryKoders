import ISyncService from './ISyncService.js';

/**
 * DummySyncAdapter
 *
 * The Null Object Pattern implementation of ISyncService.
 * Active during MVP / single-user mode (when MULTI_USER_ENABLED = false).
 *
 * Intentionally does nothing — it satisfies the Orchestrator's dependency
 * on a sync service without triggering any actual WebSocket broadcasts.
 * This allows the single-user pipeline to run perfectly without Pusher.
 */
class DummySyncAdapter extends ISyncService {
  async broadcastUpdate(workspaceId, payload) {
    // Null Object Pattern: log the suppressed event, but do nothing else.
    console.log(`[MVP Mode] Broadcast suppressed for Workspace: ${workspaceId}`);
    return true;
  }
}

export default DummySyncAdapter;
