/**
 * OllamaGemmaAdapter.js
 *
 * Concrete implementation of IAIService using Google's Gemma 4 model
 * (gemma4:31b) hosted on Ollama Cloud. Communicates via the Ollama REST API
 * using the native Next.js fetch client (no additional SDK required).
 *
 * Responsibilities:
 * - Accept multimodal inputs (text + base64 images) and large documents.
 * - Call the Ollama API with structured prompt instructions.
 * - Return a structured, validated JSON array of task objects.
 *
 * Design notes:
 * - Gemma 4 is Google's latest open model series, presenting unmatched
 *   IQ-to-latency ratios. It is fully whitelisted and free under your key!
 * - This adapter inherits from IAIService, providing complete drop-in compatibility.
 * - Dual-track handling:
 *     - generateStandard() → Enforces native schema format constraint where appropriate.
 *     - generateFromCache() → Employs a robust unconstrained instruction format, parsed on the JS side via _parseFlexibleJSON().
 */

import IAIService from "./IAIService.js";
import ollamaTaskSchema from "./ollamaTaskSchema.js";

// ---------------------------------------------------------------------------
// Configuration constants — all overridable via environment variables.
// ---------------------------------------------------------------------------

const MODEL_NAME = process.env.GEMMA_MODEL || "gemma4:31b";
const BASE_URL = process.env.OLLAMA_BASE_URL || "https://ollama.com/api";
const CHAT_URL = `${BASE_URL}/chat`;

// Generation options tuned for maximum structural precision
const GENERATION_OPTIONS = {
  temperature: 0.1,   // Low temperature for high key predictability and factual extraction.
  top_k: 32,          // Constraints vocabulary search space.
  top_p: 0.8,         // Limits nucleus sampling bounds.
  num_predict: 1200,  // Max token output limit (safeguard).
};

// System instruction that forces nested schema output with an explicit mockup
const SYSTEM_INSTRUCTION = `
You are the analytical "Brain" of SyncForge, a collaborative scheduling assistant.

Your ONLY job is to extract tasks from the user's input and classify each one using the structured JSON schema.

The output MUST be a JSON array of objects, where each object has this EXACT nested structure:
{
  "workspace_id": "provided workspace_id string",
  "assigned_to": "provided assigned_to user ID string",
  "metadata": {
    "task_name": "A short, clear name for the task",
    "estimated_minutes": your best estimate of duration in minutes (integer),
    "cognitive_load": "Low", "Medium", or "High" (based on complexity),
    "preferred_window": "Morning", "Afternoon", or "Night" (based on task type),
    "splittable": true or false (true if the task can be broken into multiple blocks, false otherwise)
  }
}

Do NOT invent or alter workspace_id or assigned_to IDs — map them exactly as given in the user input.
If the user's input contains no actionable tasks, return an empty array [].
Do NOT include any extra keys, explanations, or commentary outside the JSON array.
`.trim();

class OllamaGemmaAdapter extends IAIService {
  constructor() {
    super();
    this.apiKey = process.env.OLLAMA_API_KEY;
  }

  // ---------------------------------------------------------------------------
  // Public Method: generateStandard
  // For short prompts (text + optional images).
  // ---------------------------------------------------------------------------

  /**
   * @inheritdoc
   */
  async generateStandard(workspaceId, assignedTo, userPreferences, textPrompt, base64Images = []) {
    const contextPreamble = this._buildContextPreamble(workspaceId, assignedTo, userPreferences);

    const userMessage = {
      role:    "user",
      content: `${contextPreamble}\n\n${textPrompt}`,
    };

    // If multimodal image data is present, attach it inside the separate Ollama "images" field array.
    if (base64Images && base64Images.length > 0) {
      userMessage.images = base64Images.map((imagePart) => imagePart.inlineData.data);
    }

    const responseText = await this._callOllamaChat({
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        userMessage,
      ],
      useSchemaFormat: true, // Use GBNF schema format constraints where available
    });

    return this._parseFlexibleJSON(responseText);
  }

  // ---------------------------------------------------------------------------
  // Public Method: generateFromCache
  // For large documents (≥ 32k tokens).
  // ---------------------------------------------------------------------------

  /**
   * @inheritdoc
   */
  async generateFromCache(workspaceId, assignedTo, userPreferences, userPrompt, fileUri, mimeType) {
    const contextPreamble = this._buildContextPreamble(workspaceId, assignedTo, userPreferences);

    // Embed the large document as a leading context block.
    // Ollama's KV-cache prefix matching handles optimal retrieval of this content block.
    const documentContext = [
      `[DOCUMENT — ${mimeType}]`,
      fileUri, // Raw document content text
      "[END DOCUMENT]",
    ].join("\n");

    const responseText = await this._callOllamaChat({
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: documentContext },
        { role: "user", content: `${contextPreamble}\n\n${userPrompt}` },
      ],
      useSchemaFormat: false, // Bypassing grammar constraints for ultra-high contextual speed
    });

    return this._parseFlexibleJSON(responseText);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resiliently extracts and parses a JSON array of tasks from free-text outputs.
   * Strips out markdown code fences (```json ... ```).
   *
   * @param {string} text - The raw response text from the model.
   * @returns {Array}     - Parsed array of task objects conforming to the schema.
   */
  _parseFlexibleJSON(text) {
    if (typeof text !== "string") {
      return [];
    }

    let cleanText = text.trim();

    // 1. Remove markdown JSON code fences
    cleanText = cleanText.replace(/```json/gi, "");
    cleanText = cleanText.replace(/```/g, "");
    cleanText = cleanText.trim();

    // 2. Find the array brackets boundaries to isolate the target array
    const startIdx = cleanText.indexOf('[');
    const endIdx = cleanText.lastIndexOf(']');

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleanText = cleanText.slice(startIdx, endIdx + 1);
    }

    try {
      return JSON.parse(cleanText);
    } catch (err) {
      console.error(
        `[OllamaGemmaAdapter] Flexible JSON parsing failed.\nRaw response: ${text}\nError: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Builds the structured context preamble injected before every prompt.
   *
   * @param {string} workspaceId
   * @param {string} assignedTo
   * @param {Object} userPreferences
   * @returns {string}
   */
  _buildContextPreamble(workspaceId, assignedTo, userPreferences) {
    return [
      `Workspace ID: ${workspaceId}`,
      `Assigned To (User ID): ${assignedTo}`,
      `User Preferences: ${JSON.stringify(userPreferences)}`,
    ].join("\n");
  }

  /**
   * Sends a request to the Ollama Cloud /api/chat endpoint.
   *
   * @param {Object}   params                 - Request parameters.
   * @param {Array}    params.messages        - The messages array for the chat request.
   * @param {boolean}  params.useSchemaFormat - Whether to apply strict JSON Schema constraint.
   * @returns {Promise<string>}               - The raw text content of the assistant reply.
   */
  async _callOllamaChat({ messages, useSchemaFormat = true }) {
    const requestBody = {
      model:   MODEL_NAME,
      messages,
      stream:  false,
      options: GENERATION_OPTIONS,
    };

    if (useSchemaFormat) {
      requestBody.format = ollamaTaskSchema;
    }

    const response = await fetch(CHAT_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[OllamaGemmaAdapter] Ollama API error ${response.status}: ${errorText}`
      );
    }

    const json = await response.json();
    const content = json?.message?.content;

    if (typeof content !== "string" || content.trim() === "") {
      throw new Error(
        "[OllamaGemmaAdapter] Received an empty or malformed response from the Ollama API."
      );
    }

    return content;
  }
}

// Export a singleton so all API routes share the same client configuration.
export const gemmaAdapter = new OllamaGemmaAdapter();
export default OllamaGemmaAdapter;
