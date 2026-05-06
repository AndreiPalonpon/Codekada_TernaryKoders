/**
 * POST /api/ai/generate
 *
 * Accepts a multimodal user prompt, calls the Gemini AI service to extract
 * a structured task array, and returns it to the caller.
 *
 * This route intentionally does NOT persist to the database or run the scheduler.
 * Those steps belong to POST /api/schedule/generate (PipelineFacade).
 * Keeping them separate makes both routes independently testable and replaceable.
 *
 * Typical caller flow:
 *   1. Client POSTs raw prompt here → receives structured task JSON.
 *   2. Client (or an orchestrating server action) POSTs that task JSON to
 *      /api/schedule/generate → gets back a fully scheduled timeline.
 *
 * Request Body:
 * {
 *   workspace_id:      string,          // MongoDB ObjectId of the workspace
 *   assigned_to:       string,          // MongoDB ObjectId of the target user
 *   user_preferences:  object,          // { preferred_window, deep_work_max_minutes, ... }
 *   text_prompt:       string,          // The user's raw task description
 *   images:            string[] (opt),  // Array of base64-encoded image data URIs
 *   file_uri:          string  (opt),   // Google AI File API URI for cached large docs
 *   file_mime_type:    string  (opt),   // MIME type of the file (e.g. "application/pdf")
 * }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import serviceManager from '@/orchestrator/ServiceManager';

// ---------------------------------------------------------------------------
// Request Validation Schema (Zod)
// The API rejects malformed payloads before any AI call is made.
// ---------------------------------------------------------------------------
const AIGenerateRequestSchema = z.object({
  workspace_id:     z.string().min(1),
  assigned_to:      z.string().min(1),
  user_preferences: z.object({
    preferred_window:       z.enum(["Morning", "Afternoon", "Night"]).optional(),
    deep_work_max_minutes:  z.number().positive().optional(),
    buffer_minutes:         z.number().nonnegative().optional(),
  }).optional().default({}),
  text_prompt:      z.string().min(1),
  images:           z.array(z.string()).optional().default([]),
  // Optional fields for the Context Caching path (large documents).
  file_uri:         z.string().optional(),
  file_mime_type:   z.string().optional(),
});

export async function POST(request) {
  const startTime = Date.now();

  // Step 1 — Parse and validate the request body.
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        data:    null,
        error:   { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' },
      },
      { status: 400 }
    );
  }

  const parseResult = AIGenerateRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        data:    null,
        error:   {
          code:    'VALIDATION_FAILED',
          message: parseResult.error.issues[0].message,
        },
      },
      { status: 400 }
    );
  }

  const {
    workspace_id,
    assigned_to,
    user_preferences,
    text_prompt,
    images,
    file_uri,
    file_mime_type,
  } = parseResult.data;

  // Step 2 — Get the AI service from the DI container (wrapped with FallbackAIDecorator).
  const aiService = await serviceManager.getAIService();

  // Step 3 — Route to the correct generation strategy:
  //   - If a file_uri is provided AND it's large enough, use cached generation.
  //   - Otherwise, use standard text/image generation.
  let tasks;

  const useCachedGeneration = !!file_uri && !!file_mime_type;

  if (useCachedGeneration) {
    tasks = await aiService.generateFromCache(
      workspace_id,
      assigned_to,
      user_preferences,
      text_prompt,
      file_uri,
      file_mime_type
    );
  } else {
    // Convert base64 image strings to the inline data parts format Gemini expects.
    const imageParts = images.map((dataUri) => ({
      inlineData: {
        mimeType: dataUri.split(";")[0].replace("data:", ""),
        data:     dataUri.split(",")[1],
      },
    }));

    tasks = await aiService.generateStandard(
      workspace_id,
      assigned_to,
      user_preferences,
      text_prompt,
      imageParts
    );
  }

  // Step 4 — Return the structured task array in the standardized envelope.
  const processingMs = Date.now() - startTime;
  return NextResponse.json(
    {
      success: true,
      data:    { tasks, generation_strategy: useCachedGeneration ? 'cache' : 'standard' },
      error:   null,
      meta:    { timestamp: new Date().toISOString(), processing_ms: processingMs },
    },
    { status: 200 }
  );
}
