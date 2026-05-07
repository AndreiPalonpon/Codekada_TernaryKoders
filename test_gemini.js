import MultimodalGeminiAdapter from './src/services/ai/MultimodalGeminiAdapter.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function test() {
  const adapter = new MultimodalGeminiAdapter();
  try {
    const res = await adapter.generateStandard(
      "ws_123",
      "user_123",
      { deep_work_hours: ["09:00", "17:00"], max_daily_load_minutes: 240 },
      "Schedule a meeting at 3:00 PM tomorrow.",
      []
    );
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
