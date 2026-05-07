/**
 * FallbackAIDecorator.js
 *
 * Decorator wrapping any IAIService implementation with fault-tolerance logic.
 *
 * Pattern: Decorator
 * - Wraps a "primary" AI adapter (e.g. MultimodalGeminiAdapter).
 * - If the primary adapter throws (API timeout, quota error, network failure),
 *   this decorator catches the error, logs it, and returns a structured
 *   "fallback" empty array so the pipeline can respond gracefully rather than crash.
 *
 * Why a Decorator and not a try-catch inside the adapter itself?
 * - Keeps MultimodalGeminiAdapter clean: it only handles happy-path generation.
 * - Allows FallbackAIDecorator to be swapped for a RetryDecorator or
 *   a SecondaryModelDecorator without touching the primary adapter at all.
 * - Follows the Open/Closed Principle: extend behavior, don't modify existing code.
 */

import IAIService from "./IAIService.js";

class FallbackAIDecorator extends IAIService {
  /**
   * @param {IAIService} primaryAdapter - The concrete adapter to wrap (e.g. geminiAdapter).
   */
  constructor(primaryAdapter) {
    super();
    this.primary = primaryAdapter;
  }

  /**
   * @inheritdoc
   */
  async generateStandard(workspaceId, assignedTo, userPreferences, textPrompt, base64Images = []) {
    try {
      return await this.primary.generateStandard(
        workspaceId,
        assignedTo,
        userPreferences,
        textPrompt,
        base64Images
      );
    } catch (error) {
      console.error("[FallbackAIDecorator] generateStandard failed:", error.message);
      return this._fallbackResponse();
    }
  }

  /**
   * @inheritdoc
   */
  async generateFromCache(workspaceId, assignedTo, userPreferences, userPrompt, fileUri, mimeType) {
    try {
      return await this.primary.generateFromCache(
        workspaceId,
        assignedTo,
        userPreferences,
        userPrompt,
        fileUri,
        mimeType
      );
    } catch (error) {
      console.error("[FallbackAIDecorator] generateFromCache failed:", error.message);
      return this._fallbackResponse();
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns a safe, empty fallback so the Orchestrator can report a
   * graceful "AI_UNAVAILABLE" state instead of a 500 crash.
   *
   * @returns {Array}
   */
  _fallbackResponse() {
    return [];
  }
}

export default FallbackAIDecorator;
