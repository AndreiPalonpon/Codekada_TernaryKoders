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
 * Date constraint fields (start_after, deadline) allow the scheduler to respect
 * chronological boundaries like "next Monday" or "2 days before the quiz".
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
          start_after: {
            type: ["string", "null"],
            description: "ISO 8601 date string. The earliest date this task may be scheduled. Null if no constraint.",
          },
          deadline: {
            type: ["string", "null"],
            description: "ISO 8601 date string. The latest date by which this task must be completed. Null if no constraint.",
          },
          priority: {
            type: "string",
            description: "Task urgency. P1 = most urgent, P2 = high, P3 = medium (default), P4 = low.",
            enum: ["P1", "P2", "P3", "P4"],
          },
          depends_on: {
            type: ["string", "null"],
            description: "The task_name of another task that must be completed before this one can start. Null if no dependency.",
          },
          fixed_time: {
            type: "boolean",
            description: "True if the user specified an EXACT time for this task (e.g., 'Meeting at 3pm'). False if it is a general task to be scheduled flexibly.",
          },
          recurrence: {
            type: ["object", "null"],
            description: "Recurrence pattern if the task repeats (e.g., 'every Monday', 'daily'). Null if it's a one-off task.",
            properties: {
              frequency: { type: "string", enum: ["DAILY", "WEEKLY", "MONTHLY"] },
              interval: { type: "integer", description: "Multiplier for frequency (e.g., 1 for every week, 2 for every other week)." },
              days_of_week: {
                type: "array",
                description: "Array of days if WEEKLY frequency (e.g., ['MO', 'WE', 'FR']).",
                items: { type: "string", enum: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] }
              }
            }
          },
        },
        required: [
          "task_name",
          "estimated_minutes",
          "cognitive_load",
          "preferred_window",
          "splittable",
          "fixed_time",
        ],
      },
    },
    required: ["workspace_id", "assigned_to", "metadata"],
  },
};

export default ollamaTaskSchema;
