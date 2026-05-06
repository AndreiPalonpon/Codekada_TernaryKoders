/**
 * scratch/test_models.js
 *
 * Automatically crawls all available models on your Ollama Cloud account and
 * probes each one to find exactly which ones are on your free tier!
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

console.log('--- Ollama Cloud Free Tier Map Generator ---');
console.log('OLLAMA_BASE_URL:', OLLAMA_BASE_URL);
console.log('--------------------------------------------\n');

async function run() {
  const TAGS_URL = `${OLLAMA_BASE_URL}/tags`;
  const CHAT_URL = `${OLLAMA_BASE_URL}/chat`;

  // 1. Fetch tags list
  let models = [];
  try {
    const response = await fetch(TAGS_URL, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${OLLAMA_API_KEY}` }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.status}`);
    }
    const data = await response.json();
    models = data.models || [];
  } catch (err) {
    console.error('Failed to query /tags endpoint:', err.message);
    return;
  }

  console.log(`Discovered ${models.length} total models on Ollama Cloud.`);
  console.log('Probing access permissions for each model...\n');

  const freeModels = [];
  const subscriptionModels = [];

  for (const m of models) {
    const modelName = m.name;
    const requestBody = {
      model: modelName,
      messages: [{ role: "user", content: "Hi" }],
      stream: false
    };

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OLLAMA_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      const sizeGB = (m.size / (1024 * 1024 * 1024)).toFixed(2);
      if (response.status === 200) {
        console.log(`🟢 [FREE] ${modelName} (${sizeGB} GB)`);
        freeModels.push({ name: modelName, size: `${sizeGB} GB` });
      } else if (response.status === 403) {
        console.log(`🔴 [PAID] ${modelName} (${sizeGB} GB)`);
        subscriptionModels.push({ name: modelName, size: `${sizeGB} GB` });
      } else {
        console.log(`⚠️ [STATUS ${response.status}] ${modelName} (${sizeGB} GB)`);
      }
    } catch (err) {
      console.log(`⚠️ [ERROR] ${modelName} -> ${err.message}`);
    }
  }

  console.log('\n======================================');
  console.log('       ACCESS MAP COMPLETE');
  console.log('======================================');
  console.log(`\n🟢 FREE/ACCESSIBLE MODELS (${freeModels.length}):`);
  freeModels.forEach(m => console.log(` - ${m.name} (${m.size})`));

  console.log(`\n🔴 SUBSCRIPTION-LOCKED MODELS (${subscriptionModels.length}):`);
  subscriptionModels.forEach(m => console.log(` - ${m.name} (${m.size})`));
}

run();
