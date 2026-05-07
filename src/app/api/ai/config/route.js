import { NextResponse } from 'next/server';
import { FLAGS } from '@/orchestrator/FeatureFlags';

export async function GET() {
  const provider = FLAGS.ACTIVE_AI_PROVIDER;
  let modelName = 'Gemini 1.5 Flash'; // Default

  if (provider === 'GEMMA') {
    modelName = process.env.GEMMA_MODEL || 'Gemma 4:31b';
  } else if (provider === 'GEMINI') {
    modelName = 'Gemini 1.5 Flash';
  } else {
    modelName = `${provider} Model`;
  }

  return NextResponse.json({
    success: true,
    provider,
    modelName,
  });
}
