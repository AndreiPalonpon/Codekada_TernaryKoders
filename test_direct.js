const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env.local', 'utf-8');
const key = env.split('GEMINI_API_KEY=')[1].split('\n')[0].trim();

const body = JSON.stringify({
  contents: [{ role: "user", parts: [{ text: "Schedule a meeting at 3pm tomorrow" }] }],
  systemInstruction: { parts: [{ text: "Output a valid JSON array of tasks." }] },
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          task_name: { type: "STRING" },
          fixed_time: { type: "BOOLEAN" }
        },
        required: ["task_name", "fixed_time"]
      }
    }
  }
});

const req = https.request(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});

req.write(body);
req.end();
