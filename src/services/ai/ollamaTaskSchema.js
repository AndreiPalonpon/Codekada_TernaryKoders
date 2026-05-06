/**
 * ollamaTaskSchema.js
 *
 * The response schema fed to the Ollama API's `format` parameter.
 *
 * Why a separate file from openApiTaskSchema.js?
 * - The Google GenAI SDK expects UPPERCASE type strings (e.g., "STRING", "ARRAY").
 * - The Ollama API follows the standard JSON Schema spec, which requires LOWERCASE
 *   type strings (e.g., "string", "array").
 * - Keeping both as separate files means each SDK gets its native format with zero
 *   runtime overhead (no case-conversion function needed).
 *
 * This schema is structurally identical to openApiTaskSchema.js — it maps 1-to-1
 * with the MongoDB Task model's "Brain" section (metadata).
 *
 * See: https://json-schema.org/understanding-json-schema/reference/type
 */

const ollamaTaskSchema = {
  type: "array",
  description: "An array of parsed tasks mapped to the workspace and assigned user.",
  items: {
    type: "object",
    properties: {
      workspace_id: {
        type: "string",
        description: "The exact workspace ObjectId provided by the caller.",
      },
      assigned_to: {
        type: "string",
        description: "The exact user ObjectId provided by the caller.",
      },
      metadata: {
        type: "object",
        properties: {
          task_name:          { type: "string" },
          estimated_minutes:  { type: "integer" },
          cognitive_load:     { type: "string", enum: ["Low", "Medium", "High"] },
          preferred_window:   { type: "string", enum: ["Morning", "Afternoon", "Night"] },
          splittable:         { type: "boolean" },
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

export default ollamaTaskSchema;
