/**
 * scratch/test_gemini.js
 *
 * Diagnostic script to test connection and responses from the Gemini API.
 * Run with: node scratch/test_gemini.js
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

const GEMINI_API_KEY = env.GEMINI_API_KEY;

console.log('--- Gemini Diagnostic Config ---');
console.log('API Key length :', GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
console.log('--------------------------------\n');

const promptText = `
Workspace ID: 6641a2f3e4b0c3a1d2e5f001
Assigned To (User ID): 6641a2f3e4b0c3a1d2e5f002
User Preferences: {"preferred_window":"Morning","deep_work_max_minutes":120}

Study for the Operating Systems exam. Review memory management and process scheduling. Prepare flashcards.
`.trim();

async function run() {
  // Use standard Gemini endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            workspace_id: { type: "STRING" },
            assigned_to: { type: "STRING" },
            metadata: {
              type: "OBJECT",
              properties: {
                task_name: { type: "STRING" },
                estimated_minutes: { type: "INTEGER" },
                cognitive_load: { type: "STRING", enum: ["Low", "Medium", "High"] },
                preferred_window: { type: "STRING", enum: ["Morning", "Afternoon", "Night"] },
                splittable: { type: "BOOLEAN" }
              },
              required: ["task_name", "estimated_minutes", "cognitive_load", "preferred_window", "splittable"]
            }
          },
          required: ["workspace_id", "assigned_to", "metadata"]
        }
      }
    }
  };

  try {
    console.log('Sending request to Gemini...');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('HTTP Status:', response.status, response.statusText);
    const text = await response.text();
    
    try {
      const parsed = JSON.parse(text);
      console.log('\nResponse:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log('\nRaw Response:', text);
    }
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

run();
