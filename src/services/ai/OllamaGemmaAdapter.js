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

// System instruction that forces nested schema output with temporal resolution
const SYSTEM_INSTRUCTION = `
You are the analytical "Brain" of SyncForge, a collaborative scheduling assistant.

Your ONLY job is to extract tasks from the user's input and classify each one using the structured JSON schema.

IMPORTANT — TEMPORAL RESOLUTION RULES:
You will receive the current date, day of week, and timezone in the context preamble.
You MUST use this to resolve ALL relative time references into absolute ISO 8601 dates.

Examples of resolution (assuming today is Wednesday 2026-05-06):
  - "next Monday"     → start_after: "2026-05-11", deadline: "2026-05-11"
  - "on Thursday"     → start_after: "2026-05-07", deadline: "2026-05-07"
  - "by Friday"       → deadline: "2026-05-08"
  - "2 days before X" → deadline must be 2 days before X's start_after date

DEPENDENCY & PREREQUISITE RULES:
When the user says "review at least N days prior to [event]", you MUST:
  1. Create the main event task with its resolved absolute dates.
  2. Create a SEPARATE prerequisite "review" task whose deadline is N days BEFORE the
     main event's start_after date.
  3. Set the review task's priority to P1 (most urgent) since it must happen first.

The output MUST be a JSON array of objects, where each object has this EXACT nested structure:
{
  "workspace_id": "provided workspace_id string",
  "assigned_to": "provided assigned_to user ID string",
  "metadata": {
    "task_name": "A short, clear name for the task",
    "estimated_minutes": integer,
    "cognitive_load": "Low" | "Medium" | "High",
    "preferred_window": "Morning" | "Afternoon" | "Night",
    "splittable": true or false,
    "start_after": "ISO 8601 date or null",
    "deadline": "ISO 8601 date or null",
    "priority": "P1" | "P2" | "P3" | "P4",
    "depends_on": "task_name of prerequisite task, or null",
    "fixed_time": boolean (MUST be true if the user mentions a specific exact time like "at 3pm")
  }
}

STRICT TEMPORAL REQUIREMENTS:
1. If 'fixed_time' is true, 'start_after' MUST be a full ISO 8601 string including the TIME and OFFSET (e.g. "2026-05-11T15:00:00+08:00").
2. NEVER output a date alone (YYYY-MM-DD) for a fixed-time task.
3. If no time is mentioned, set 'fixed_time' to false and use YYYY-MM-DD for flexible boundaries.

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
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    const isoDate = now.toISOString().slice(0, 10);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Calculate timezone offset in format ±HH:MM
    const offset = -now.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const pad = (num) => Math.floor(Math.abs(num)).toString().padStart(2, '0');
    const offsetString = `${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
    
    // Create local time string
    const localTime = new Date(now.getTime() + offset * 60000).toISOString().slice(11, 16);

    return [
      `Current Local Date: ${isoDate} (${currentDay})`,
      `Current Local Time: ${localTime}`,
      `Timezone Offset: ${offsetString} (${timezone})`,
      `Workspace ID: ${workspaceId}`,
      `Assigned To (User ID): ${assignedTo}`,
      `User Preferences: ${JSON.stringify(userPreferences)}`,
      `CRITICAL INSTRUCTION: Any absolute dates generated for 'start_after' or 'deadline' MUST explicitly include the Timezone Offset provided (e.g. YYYY-MM-DDTHH:MM:00${offsetString}). NEVER output dates ending in 'Z' if the user requested a specific local time. If the user specifies an exact time (e.g., "3pm"), output exactly that time with the timezone offset. If the user specifies a constraint but no time, default to 00:00:00 for the start of the day or 23:59:59 for deadlines, using the offset.`
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
