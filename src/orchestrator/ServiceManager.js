import { FLAGS, AI_PROVIDERS } from './FeatureFlags.js';
import NUserBinPacking from '../services/scheduler/NUserBinPacking.js';
import DummySyncAdapter from '../services/realtime/DummySyncAdapter.js';

/**
 * ServiceManager
 *
 * Dependency Injection (DI) container for the Orchestrator.
 * Reads FeatureFlags and returns the correct concrete service implementation.
 *
 * This decouples the Orchestrator from specific service implementations —
 * swapping from DummySyncAdapter to PusherAdapter requires only a flag change,
 * and swapping between different AI providers requires only a config update.
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

  /**
   * Returns the AI service, always wrapped in FallbackAIDecorator.
   *
   * The FallbackAIDecorator ensures that if the active AI API is unavailable
   * (timeout, quota exhausted, network failure), the pipeline receives an
   * empty array instead of an unhandled exception.
   *
   * Adapter selection is driven by the ACTIVE_AI_PROVIDER feature flag:
   *   - AI_PROVIDERS.GEMINI   → MultimodalGeminiAdapter (Gemini 2.5 Flash).
   *   - AI_PROVIDERS.GEMMA    → OllamaGemmaAdapter (Gemma 4).
   *
   * Both imports are dynamic to avoid loading any AI SDK on pages that never
   * touch the AI pipeline.
   */
  async getAIService() {
    const { default: FallbackAIDecorator } = await import('../services/ai/FallbackAIDecorator.js');

    switch (FLAGS.ACTIVE_AI_PROVIDER) {
      case AI_PROVIDERS.GEMMA: {
        const { gemmaAdapter } = await import('../services/ai/OllamaGemmaAdapter.js');
        return new FallbackAIDecorator(gemmaAdapter);
      }
      
      case AI_PROVIDERS.GEMINI:
      default: {
        const { geminiAdapter } = await import('../services/ai/MultimodalGeminiAdapter.js');
        return new FallbackAIDecorator(geminiAdapter);
      }
    }
  }
}

// Export a singleton so the Orchestrator shares the same DI container.
export default new ServiceManager();

