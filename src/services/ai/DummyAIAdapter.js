/**
 * DummyAIAdapter
 *
 * A mock implementation of the Phase 1 AI Service that returns hardcoded
 * task metadata without calling the Gemini API. Used during hackathon
 * development to unblock frontend ↔ backend integration testing.
 *
 * Follows the IAIService contract defined in the architecture rules.
 * Replace with MultimodalGeminiAdapter once the real AI prompt is finalized.
 */
class DummyAIAdapter {

  /**
   * Simulates AI-driven task extraction from multimodal inputs.
   *
   * Adds a 2-second delay to mimic network/LLM latency so the frontend
   * loading states (spinner, disabled button) can be visually verified.
   *
   * @param {Array<{type: string, content: string}>} inputs - Multimodal input array.
   * @param {Object} userPreferences - User scheduling preferences (unused in dummy).
   * @returns {Promise<Array<Object>>} Array of Phase 1 task metadata objects.
   */
  async extractTasks(inputs, userPreferences) {
    // Simulate network + LLM processing latency
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Extract a snippet from the first text input for realistic mock task names.
    const rawText = inputs?.[0]?.content || "Untitled task";
    const snippet = rawText.length > 40
      ? rawText.substring(0, 40) + "…"
      : rawText;

    // Return hardcoded Phase 1 schema-compliant tasks.
    // Shape matches the AI output spec: task_name, estimated_minutes,
    // cognitive_load, preferred_window, splittable.
    return [
      {
        task_name: `Draft: ${snippet}`,
        estimated_minutes: 90,
        cognitive_load: "High",
        preferred_window: "Morning",
        splittable: true,
      },
      {
        task_name: `Review & Revise: ${snippet}`,
        estimated_minutes: 45,
        cognitive_load: "Medium",
        preferred_window: "Afternoon",
        splittable: false,
      },
      {
        task_name: `Final Check: ${snippet}`,
        estimated_minutes: 20,
        cognitive_load: "Low",
        preferred_window: "Afternoon",
        splittable: false,
      },
    ];
  }
}

export default DummyAIAdapter;
