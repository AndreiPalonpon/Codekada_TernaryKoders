/**
 * MultimodalGeminiAdapter.js
 *
 * Concrete implementation of IAIService using the Google Gemini 2.5 Flash model.
 * Uses the @google/genai SDK (the newer, actively maintained replacement for
 * @google/generative-ai).
 *
 * Responsibilities:
 * - Accept multimodal inputs (text + base64 images) and large cached documents.
 * - Call the Gemini API with strict generation config to enforce schema adherence.
 * - Return a structured, validated JSON array of task objects.
 *
 * Design notes:
 * - This class is ONLY responsible for AI generation. It does not touch the DB,
 *   the scheduler, or the HTTP layer — that is the Orchestrator's job.
 * - For short prompts (< 32k tokens), use generateStandard().
 * - For large document uploads (syllabus, transcripts), use generateFromCache()
 *   which uses the Gemini Context Caching API to preserve tokens.
 */

import { GoogleGenAI } from "@google/genai";
import IAIService from "./IAIService.js";
import openApiTaskSchema from "./openApiTaskSchema.js";

// ---------------------------------------------------------------------------
// Model name — see aiservice.md Section 2 for justification.
// ---------------------------------------------------------------------------
const MODEL_NAME = "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Generation config — shared between both generation strategies.
// See aiservice.md Section 2 for justification of each value.
// ---------------------------------------------------------------------------
const GENERATION_CONFIG = {
  responseMimeType: "application/json",
  responseSchema:   openApiTaskSchema,
  maxOutputTokens:  1000,   // Circuit breaker: prevents runaway token drain.
  temperature:      0.1,    // Near-deterministic; prevents hallucinated keys.
  topK:             32,     // Vocabulary constraint for schema adherence.
  topP:             0.8,    // Token probability threshold.
};

// The system instruction that defines the AI's role in the pipeline.
// Date context is injected dynamically via _buildContextPreamble().
const SYSTEM_INSTRUCTION = `
You are the analytical "Brain" of SyncForge, a collaborative scheduling assistant.

Your ONLY job is to extract tasks from the user's input and classify each one using
the structured JSON schema provided. You must map every task to the provided
workspace_id and assigned_to user ID exactly as given — do not invent or alter IDs.

IMPORTANT — TEMPORAL RESOLUTION RULES:
You will receive the current date, day of week, and timezone in the context preamble.
You MUST use this to resolve ALL relative time references into absolute ISO 8601 dates.

Examples of resolution (assuming today is Wednesday 2026-05-06):
  - "next Monday"     → start_after: "2026-05-11", deadline: "2026-05-11"
  - "on Thursday"     → start_after: "2026-05-07", deadline: "2026-05-07"
  - "by Friday"       → deadline: "2026-05-08"
  - "2 days before X" → deadline must be 2 days before X's start_after date

RECURRING & FREQUENCY RULES:
If the user requests a recurring task (e.g. "every day", "daily", "every week", "every Tuesday"), you MUST expand this frequency and generate SEPARATE, INDEPENDENT task objects for EACH individual occurrence from today's date onwards up to the next 7 days (or up to the specified exam/event deadline). Do NOT output a single task representing the recurrence; output multiple task objects (e.g. one daily task object for each day).

PLANNING TIME LIMITS & DEFAULT BUFFER SCOPE:
Do NOT generate any tasks or recurrences that extend past a maximum 14-day look-ahead window starting from the current date. This provides a safety time buffer so that tasks do not get scheduled indefinitely or in an infinite time scope.
If a task does NOT have an explicitly requested deadline, you MUST assign it a default deadline of exactly 7 days from today. Do not leave 'deadline' null unless absolutely necessary.
If the user mentions any reference events, exams, classes, meetings, or constraints (e.g. "because I have an exam next week at 7:30 am" or "due to a seminar at 3pm"), you MUST extract that event/milestone itself as a separate, distinct task object with 'fixed_time' set to true, so that it actually appears on the user's calendar.

DEPENDENCY & PREREQUISITE RULES:
When the user says "review at least N days prior to [event]", you MUST:
  1. Create the main event task with its resolved absolute dates.
  2. Create a SEPARATE prerequisite "review" task whose deadline is N days BEFORE the
     main event's start_after date.
  3. Set the review task's depends_on field to null and the main event can depend on the review.
  4. Set the review task's priority to P1 (most urgent) since it must happen first.

For each task you extract, determine:
- task_name:          A short, clear name for the task.
- estimated_minutes:  Your best estimate of how long this task will take (integer).
- cognitive_load:     One of "Low", "Medium", or "High", based on complexity.
- preferred_window:   One of "Morning", "Afternoon", or "Night", based on task type.
- splittable:         true if the task can be broken into multiple time blocks, false otherwise.
- start_after:        ISO 8601 date string (e.g. "2026-05-11") — earliest date this task may be scheduled. null if unconstrained.
- deadline:           ISO 8601 date string — latest date by which this task must be completed. null if unconstrained.
- priority:           P1 (urgent/prerequisite) through P4 (low). Default P3.
- depends_on:         task_name of a prerequisite task, or null.
- fixed_time:         boolean. You MUST set this to true if the user mentions a specific time (e.g. "at 3pm", "10:00", "by noon", "from 8am to 10am"). If true, you MUST provide the exact time in 'start_after' using the provided timezone offset.

STRICT TEMPORAL REQUIREMENTS:
1. If 'fixed_time' is true, 'start_after' MUST be a full ISO 8601 string including the TIME and OFFSET (e.g. "2026-05-11T15:00:00+08:00").
2. NEVER output a date alone (YYYY-MM-DD) for a fixed-time task.
3. If no time is mentioned, set 'fixed_time' to false and use YYYY-MM-DD for flexible boundaries.

If the user's input contains no actionable tasks, return an empty array [].
Do NOT include any extra keys, explanations, or commentary — only valid JSON.
`.trim();

class MultimodalGeminiAdapter extends IAIService {
  constructor() {
    super();
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  // ---------------------------------------------------------------------------
  // Public Method: generateStandard
  // For short prompts (text + optional images). No caching required.
  // ---------------------------------------------------------------------------

  /**
   * @inheritdoc
   */
  async generateStandard(workspaceId, assignedTo, userPreferences, textPrompt, base64Images = []) {
    const contextPreamble = this._buildContextPreamble(workspaceId, assignedTo, userPreferences);

    console.log(`\n==========================================`);
    console.log(`[AI PROMPTING LOGS] - MultimodalGeminiAdapter`);
    console.log(`==========================================`);
    console.log(`- Workspace ID: ${workspaceId}`);
    console.log(`- Assigned To: ${assignedTo}`);
    console.log(`- User Prompt:\n"${textPrompt}"`);
    console.log(`- Context Preamble:\n${contextPreamble}`);
    console.log(`- System Instruction:\n${SYSTEM_INSTRUCTION}`);
    console.log(`==========================================\n`);

    // Build the contents array: context preamble, then user prompt, then any images.
    const textParts = [
      { text: contextPreamble },
      { text: textPrompt },
    ];

    // base64Images are expected as { inlineData: { mimeType, data } } objects.
    const allParts = [...textParts, ...base64Images];

    // Dynamically calculate the optimal reasoning budget based on input complexity.
    const budget = this._determineThinkingBudget(textPrompt, base64Images, false);

    const response = await this.ai.models.generateContent({
      model:   MODEL_NAME,
      contents: [{ role: "user", parts: allParts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        ...GENERATION_CONFIG,
        thinkingConfig: { thinkingBudget: budget },
      },
    });

    console.log(`\n==========================================`);
    console.log(`[GEMINI RAW RESPONSE CONTENT]`);
    console.log(`==========================================`);
    console.log(response.text);
    console.log(`==========================================\n`);

    const parsedTasks = JSON.parse(response.text);
    console.log(`[AI PROMPTING LOGS] Parsed ${parsedTasks.length} tasks successfully.`);
    return parsedTasks;
  }

  // ---------------------------------------------------------------------------
  // Public Method: generateFromCache
  // For large documents (≥ 32k tokens). Uses the Gemini Context Caching API.
  // ---------------------------------------------------------------------------

  /**
   * @inheritdoc
   */
  async generateFromCache(workspaceId, assignedTo, userPreferences, userPrompt, fileUri, mimeType) {
    // Step 1 — Create a cache bundling the system instruction + the large document.
    // TTL of 3600s = 60 minutes; long enough to survive a full study session.
    const cache = await this.ai.caches.create({
      model: MODEL_NAME,
      config: {
        displayName:       `syncforge_workspace_${workspaceId}`,
        systemInstruction: SYSTEM_INSTRUCTION,
        contents: [
          {
            role:  "user",
            parts: [{ fileData: { fileUri, mimeType } }],
          },
        ],
        ttl: "3600s",
      },
    });

    // Step 2 — Construct the context preamble and user prompt.
    const contextPreamble = this._buildContextPreamble(workspaceId, assignedTo, userPreferences);

    // Step 3 — Fire the generation request referencing the cache.
    // Dynamically calculate the optimal reasoning budget (always 1024 for heavy cache documents).
    const budget = this._determineThinkingBudget(userPrompt, [], true);

    const response = await this.ai.models.generateContent({
      model:    MODEL_NAME,
      contents: [{
        role:  "user",
        parts: [{ text: contextPreamble }, { text: userPrompt }],
      }],
      config: {
        cachedContent:    cache.name,
        responseMimeType: "application/json",
        responseSchema:   openApiTaskSchema,
        temperature:      0.1,
        thinkingConfig:   { thinkingBudget: budget },
      },
    });

    return JSON.parse(response.text);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Dynamically determines the optimal thinking budget based on input signals.
   *
   * @param {string} textPrompt - The user's input prompt.
   * @param {Array}  images     - Array of base64 image objects.
   * @param {boolean} isCached  - True if utilizing Context Caching (dense documents).
   * @returns {number}          - The optimal thinkingBudget (0 or 1024).
   */
  _determineThinkingBudget(textPrompt = "", images = [], isCached = false) {
    // 1. All cached documents (typically ≥32,000 tokens of dense syllabus/transcripts)
    //    require step-by-step reasoning for perfect extraction.
    if (isCached) {
      return 1024;
    }

    // 2. Multimodal inputs (e.g., screenshots of schedules or notes)
    //    need extra reasoning to bridge visual text parsing with scheduling logic.
    if (images && images.length > 0) {
      return 1024;
    }

    // 3. High-complexity keywords indicating analytical scheduling decisions are required.
    const complexityKeywords = [
      "syllabus", "exam", "grading", "project", 
      "meeting", "transcript", "schedule", "lecture"
    ];
    const hasComplexKeyword = complexityKeywords.some(keyword => 
      textPrompt.toLowerCase().includes(keyword)
    );

    // 4. Input density: long text descriptions (> 1000 characters) represent
    //    messy, unstructured thoughts that need planning to classify.
    if (textPrompt.length > 1000 || hasComplexKeyword) {
      return 1024;
    }

    // 5. Default happy path: short, direct statements get 0 tokens of thinking budget
    //    for ultra-fast, sub-second latency.
    return 0;
  }

  /**
   * Builds the structured context preamble injected before every prompt.
   * Giving the model the IDs and preferences here prevents hallucinated values.
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
    
    // Calculate local date elements correctly (independent of UTC)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${date}`;
    
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
}

// Export a singleton so all API routes share the same SDK client instance.
export const geminiAdapter = new MultimodalGeminiAdapter();
export default MultimodalGeminiAdapter;
