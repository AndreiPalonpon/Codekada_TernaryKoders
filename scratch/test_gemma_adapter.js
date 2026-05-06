/**
 * scratch/test_gemma_adapter.js
 *
 * Isolated integration test for the new OllamaGemmaAdapter.
 * Automatically loads .env.local into process.env to match Next.js behavior.
 * Run with: node scratch/test_gemma_adapter.js
 */

import fs from 'fs';
import path from 'path';

// Parse .env.local manually and assign to process.env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
});

// Now import the adapter (it will successfully read process.env values!)
const { gemmaAdapter } = await import('../src/services/ai/OllamaGemmaAdapter.js');

console.log('--- Testing OllamaGemmaAdapter ---');
console.log('Active model configuration:', process.env.GEMMA_MODEL || 'gemma4:31b');
console.log('API Key length :', process.env.OLLAMA_API_KEY ? process.env.OLLAMA_API_KEY.length : 0);
console.log('----------------------------------\n');

const workspaceId = "6641a2f3e4b0c3a1d2e5f001";
const assignedTo = "6641a2f3e4b0c3a1d2e5f002";
const userPreferences = { preferred_window: "Morning", deep_work_max_minutes: 120 };

async function testStandard() {
  console.log('1. Testing generateStandard()...');
  const textPrompt = "Create a task to build the main landing page. It is a high cognitive load task, takes 120 minutes, splittable, and preferred window is Afternoon.";
  
  try {
    const tasks = await gemmaAdapter.generateStandard(workspaceId, assignedTo, userPreferences, textPrompt);
    console.log('Success! Standard tasks extracted:');
    console.log(JSON.stringify(tasks, null, 2));
    return tasks.length > 0;
  } catch (err) {
    console.error('generateStandard failed:', err);
    return false;
  }
}

async function testFromCache() {
  console.log('\n2. Testing generateFromCache()...');
  const userPrompt = "Generate the task lists mentioned in the syllabus.";
  const documentContent = `
  SYLLABUS - CS302 Advanced Algorithms
  Lectures:
  - Week 1: Binary Search Tree implementation (High cognitive load, 180 mins)
  - Week 2: Merge Sort Analysis quiz (Medium cognitive load, 60 mins)
  `;

  try {
    const tasks = await gemmaAdapter.generateFromCache(workspaceId, assignedTo, userPreferences, userPrompt, documentContent, "text/plain");
    console.log('Success! Cached/Document tasks extracted:');
    console.log(JSON.stringify(tasks, null, 2));
    return tasks.length > 0;
  } catch (err) {
    console.error('generateFromCache failed:', err);
    return false;
  }
}

async function run() {
  const standardOk = await testStandard();
  const cacheOk = await testFromCache();
  
  if (standardOk && cacheOk) {
    console.log('\n🌟 ALL ISOLATED ADAPTER TESTS PASSED TRIUMPHANTLY! 🌟');
  } else {
    console.error('\n❌ Some adapter tests failed. Review logs above.');
  }
}

run();
