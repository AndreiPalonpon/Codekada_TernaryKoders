/**
 * openApiTaskSchema.js
 *
 * The response schema fed to the Gemini API's `responseSchema` config.
 *
 * Keeping this in its own file means both MultimodalGeminiAdapter and any test
 * suite can import the single source of truth — no duplication, no drift.
 *
 * Uses the @google/genai SDK type format (uppercase strings).
 * See: https://ai.google.dev/gemini-api/docs/structured-output
 *
 * This schema maps 1-to-1 with the MongoDB Task model's "Brain" section (metadata),
 * plus the required relational links (workspace_id, assigned_to).
 */

const openApiTaskSchema = {
  type: "ARRAY",
  description: "An array of parsed tasks mapped to the workspace and assigned user.",
  items: {
    type: "OBJECT",
    properties: {
      workspace_id: {
        type: "STRING",
        description: "The exact workspace ObjectId provided by the caller.",
      },
      assigned_to: {
        type: "STRING",
        description: "The exact user ObjectId provided by the caller.",
      },
      metadata: {
        type: "OBJECT",
        properties: {
          task_name:          { type: "STRING" },
          estimated_minutes:  { type: "INTEGER" },
          cognitive_load:     { type: "STRING", enum: ["Low", "Medium", "High"] },
          preferred_window:   { type: "STRING", enum: ["Morning", "Afternoon", "Night"] },
          splittable:         { type: "BOOLEAN" },
        },
        required: [
          "task_name",
          "estimated_minutes",
          "cognitive_load",
          "preferred_window",
          "splittable",
        ],
      },
    },
    required: ["workspace_id", "assigned_to", "metadata"],
  },
};

export default openApiTaskSchema;
