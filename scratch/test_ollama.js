/**
 * scratch/test_ollama.js
 *
 * Diagnostic script to test task extraction on Gemma 4 using the nested layout prompt instructions.
 */

import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const OLLAMA_API_KEY = env.OLLAMA_API_KEY;
const OLLAMA_BASE_URL = env.OLLAMA_BASE_URL || "https://ollama.com/api";
const MODEL_NAME = "gemma4:31b";

console.log('--- Nested Layout Prompt Test (Gemma 4) ---');
console.log('OLLAMA_BASE_URL:', OLLAMA_BASE_URL);
console.log('MODEL_NAME     :', MODEL_NAME);
console.log('--------------------------------------------\n');

// Standard JSON schema
const ollamaTaskSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      workspace_id: { type: "string" },
      assigned_to: { type: "string" },
      metadata: {
        type: "object",
        properties: {
          task_name:          { type: "string" },
          estimated_minutes:  { type: "integer" },
          cognitive_load:     { type: "string", enum: ["Low", "Medium", "High"] },
          preferred_window:   { type: "string", enum: ["Morning", "Afternoon", "Night"] },
          splittable:         { type: "boolean" },
        },
        required: ["task_name", "estimated_minutes", "cognitive_load", "preferred_window", "splittable"],
      }
    },
    required: ["workspace_id", "assigned_to", "metadata"]
  }
};

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

const userMessage = [
  "Workspace ID: 6641a2f3e4b0c3a1d2e5f001",
  "Assigned To (User ID): 6641a2f3e4b0c3a1d2e5f002",
  "User Preferences: {\"preferred_window\":\"Morning\",\"deep_work_max_minutes\":120}",
  "Study for the Operating Systems exam. Review memory management and process scheduling. Prepare flashcards."
].join("\n");

async function run() {
  const CHAT_URL = `${OLLAMA_BASE_URL}/chat`;
  const requestBody = {
    model: MODEL_NAME,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: userMessage }
    ],
    stream: false,
    format: ollamaTaskSchema,
    options: {
      temperature: 0.1,
      top_k: 32,
      top_p: 0.8,
      num_predict: 1000,
    }
  };

  try {
    console.log('Sending request...');
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('HTTP Status:', response.status);
    const responseText = await response.text();
    console.log('\nResponse Content:');
    try {
      const parsed = JSON.parse(responseText);
      console.log(parsed.message?.content);
    } catch {
      console.log(responseText);
    }
  } catch (err) {
    console.error('\nFetch Error:', err);
  }
}

run();
