import { NextResponse } from 'next/server';
import { z } from 'zod';
import pipeline from '@/orchestrator/PipelineFacade';

/**
 * PATCH /api/schedule/recalculate
 *
 * Handles schedule interruptions (Snooze, Missed Task).
 * Skips the AI — only the JS deterministic math runs, making this very fast.
 *
 * Request Body:
 * {
 *   workspace_id: string,
 *   interrupted_task_id: string,
 *   action: 'snooze' | 'missed',
 *   delay_minutes: number,
 *   busy_blocks: [{ busy: [{ start, end }] }],
 *   triggered_by: string
 * }
 */

const RecalculateRequestSchema = z.object({
  workspace_id: z.string().min(1),
  interrupted_task_id: z.string().min(1),
  action: z.enum(['snooze', 'missed', 'complete']),
  delay_minutes: z.number().min(0).optional(),
  busy_blocks: z.array(z.object({
    busy: z.array(z.object({
      start: z.string(),
      end: z.string(),
    })),
  })),
  triggered_by: z.string().min(1),
});

export async function PATCH(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } },
      { status: 400 }
    );
  }

  const parseResult = RecalculateRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'VALIDATION_FAILED', message: parseResult.error.issues[0].message },
      },
      { status: 400 }
    );
  }

  const { workspace_id, interrupted_task_id, action, delay_minutes, busy_blocks, triggered_by } = parseResult.data;

  const result = await pipeline.recalculateSchedule(
    workspace_id,
    interrupted_task_id,
    action,
    delay_minutes ?? 0,
    busy_blocks,
    triggered_by
  );

  const statusCode = result.success ? 200 : (result.error?.code === 'TASK_NOT_FOUND' ? 404 : 500);
  return NextResponse.json(result, { status: statusCode });
}
