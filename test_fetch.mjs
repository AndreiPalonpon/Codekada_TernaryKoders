import 'dotenv/config';

const key = process.env.GEMINI_API_KEY;

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

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body
}).then(res => res.json()).then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
