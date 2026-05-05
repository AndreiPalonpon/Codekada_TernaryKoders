import { NextResponse } from 'next/server';
import { z } from 'zod';
import pipeline from '@/orchestrator/PipelineFacade';

/**
 * POST /api/schedule/generate
 *
 * Ingests AI-enriched task metadata and runs the deterministic bin-packing scheduler.
 * The AI call is expected to have already happened on the client or in a prior step.
 *
 * Request Body:
 * {
 *   workspace_id: string,
 *   tasks: [{ metadata: { task_name, estimated_minutes, cognitive_load, ... }, ... }],
 *   busy_blocks: [{ busy: [{ start, end }] }],  // One entry per user calendar
 *   triggered_by: string  // User ID of the requester
 * }
 */

// Zod schema: validates the incoming payload before any business logic runs.
const TaskInputSchema = z.object({
  metadata: z.object({
    task_name: z.string().min(1),
    estimated_minutes: z.number().positive(),
    cognitive_load: z.enum(['Low', 'Medium', 'High']),
    priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
    due_date: z.string().datetime().optional(),
    preferred_window: z.string().optional(),
    splittable: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
  assigned_to: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
});

const GenerateRequestSchema = z.object({
  workspace_id: z.string().min(1),
  tasks: z.array(TaskInputSchema).min(1),
  busy_blocks: z.array(z.object({
    busy: z.array(z.object({
      start: z.string(),
      end: z.string(),
    })),
  })),
  triggered_by: z.string().min(1),
});

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } },
      { status: 400 }
    );
  }

  // Validate with Zod before touching any business logic.
  const parseResult = GenerateRequestSchema.safeParse(body);
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

  const { workspace_id, tasks, busy_blocks, triggered_by } = parseResult.data;

  const result = await pipeline.generateSchedule(workspace_id, tasks, busy_blocks, triggered_by);

  const statusCode = result.success ? 200 : (result.error?.code === 'WORKSPACE_NOT_FOUND' ? 404 : 500);
  return NextResponse.json(result, { status: statusCode });
}
