import { FLAGS } from './FeatureFlags.js';
import NUserBinPacking from '../services/scheduler/NUserBinPacking.js';
import DummySyncAdapter from '../services/realtime/DummySyncAdapter.js';

/**
 * ServiceManager
 *
 * Dependency Injection (DI) container for the Orchestrator.
 * Reads FeatureFlags and returns the correct concrete service implementation.
 *
 * This decouples the Orchestrator from specific service implementations —
 * swapping from DummySyncAdapter to PusherAdapter requires only a flag change.
 */
class ServiceManager {
  /**
   * Returns the active scheduler engine instance.
   * Currently always NUserBinPacking, but abstracted here for future swapping.
   */
  getScheduler() {
    return new NUserBinPacking();
  }

  /**
   * Returns the correct real-time sync adapter based on the current feature flags.
   * MVP: DummySyncAdapter (no-op).
   * Bonus/Collab Mode: PusherAdapter (actual broadcasts).
   */
  async getSyncService() {
    if (FLAGS.MULTI_USER_ENABLED) {
      // Dynamically import PusherAdapter only when the flag is on,
      // so the Pusher SDK is not loaded unnecessarily in MVP mode.
      const { default: PusherAdapter } = await import('../services/realtime/PusherAdapter.js');
      return new PusherAdapter();
    }

    return new DummySyncAdapter();
  }
}

// Export a singleton so the Orchestrator shares the same DI container.
export default new ServiceManager();
