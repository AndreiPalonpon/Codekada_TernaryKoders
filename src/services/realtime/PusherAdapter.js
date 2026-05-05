import ISyncService from './ISyncService.js';

/**
 * PusherAdapter
 *
 * Real-time broadcast adapter using the Pusher managed WebSocket service.
 * Only instantiated when MULTI_USER_ENABLED = true (via ServiceManager).
 *
 * Note: This is the stub for the bonus collaborative feature.
 * Full implementation connects to the Pusher Node SDK and broadcasts
 * to the private-workspace-{workspaceId} channel.
 */
class PusherAdapter extends ISyncService {
  async broadcastUpdate(workspaceId, payload) {
    // TODO (Bonus/Collab): Initialize Pusher client and trigger event.
    // const pusher = new Pusher({ appId, key, secret, cluster });
    // await pusher.trigger(`private-workspace-${workspaceId}`, 'schedule_updated', payload);
    console.log(`[PusherAdapter] Broadcasting to workspace: ${workspaceId}`);
    return true;
  }
}

export default PusherAdapter;
