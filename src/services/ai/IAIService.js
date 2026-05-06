/**
 * IAIService.js
 *
 * Abstract interface for the AI generation service.
 *
 * Every concrete AI adapter (e.g. MultimodalGeminiAdapter) must extend this class
 * and implement both methods. This contract lets ServiceManager swap adapters
 * without the Orchestrator caring about the underlying model or SDK.
 */

class IAIService {
  /**
   * Generates a structured task array from a short text/image prompt.
   * Used when the input does not meet the 32,000-token caching threshold.
   *
   * @param {string}        workspaceId      - MongoDB ObjectId of the target workspace.
   * @param {string}        assignedTo       - MongoDB ObjectId of the user being assigned tasks.
   * @param {Object}        userPreferences  - User scheduling prefs (preferred_window, etc.).
   * @param {string}        textPrompt       - The user's raw task description.
   * @param {Array<Object>} base64Images     - Optional array of base64 image part objects.
   * @returns {Promise<Array<Object>>}       - Validated array of task objects.
   */
  async generateStandard(workspaceId, assignedTo, userPreferences, textPrompt, base64Images = []) {
    throw new Error("IAIService: 'generateStandard()' must be implemented.");
  }

  /**
   * Generates a structured task array from a large cached document (e.g. syllabus).
   * Uses the Gemini Context Caching API to avoid re-uploading the document each call.
   *
   * @param {string} workspaceId     - MongoDB ObjectId of the target workspace.
   * @param {string} assignedTo      - MongoDB ObjectId of the user being assigned tasks.
   * @param {Object} userPreferences - User scheduling prefs.
   * @param {string} userPrompt      - The specific extraction instruction.
   * @param {string} fileUri         - The Google AI File API URI of the uploaded document.
   * @param {string} mimeType        - MIME type of the file (e.g. "application/pdf").
   * @returns {Promise<Array<Object>>} - Validated array of task objects.
   */
  async generateFromCache(workspaceId, assignedTo, userPreferences, userPrompt, fileUri, mimeType) {
    throw new Error("IAIService: 'generateFromCache()' must be implemented.");
  }
}

export default IAIService;
