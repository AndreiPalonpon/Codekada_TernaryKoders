import { NextResponse } from 'next/server';
import { z } from 'zod';
import pipeline from '@/orchestrator/PipelineFacade';

/**
 * Request Validation Schema (Zod)
 * Validates the Phase 2 payload before reaching the orchestrator.
 */
const TaskMetadataSchema = z.object({
  task_name: z.string().min(1),
  estimated_minutes: z.number().nonnegative(),
  cognitive_load: z.enum(['High', 'Medium', 'Low']),
  preferred_window: z.string().optional(),
  splittable: z.boolean().optional(),
});

const TaskSchema = z.object({
  metadata: TaskMetadataSchema,
  depends_on: z.array(z.string()).optional(),
  assigned_to: z.string().optional(),
});

const GenerateRequestSchema = z.object({
  workspace_id: z.string().min(1),
  tasks: z.array(TaskSchema),
  busy_blocks: z.array(z.object({
    busy: z.array(z.object({
      start: z.string(),
      end: z.string(),
    })).optional().default([]),
  })).optional().default([{ busy: [] }]),
  triggered_by: z.string().min(1),
});

/**
 * POST /api/schedule/generate
 *
 * Persisted Phase 2 Scheduler Generation.
 * Passes the parsed tasks, busy blocks, and workspace ID to the PipelineFacade,
 * which executes NUserBinPacking, saves the results to MongoDB, and broadcasts updates.
 */
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

  try {
    const result = await pipeline.generateSchedule(workspace_id, tasks, busy_blocks, triggered_by);
    const statusCode = result.success ? 200 : (result.error?.code === 'WORKSPACE_NOT_FOUND' ? 404 : 500);
    return NextResponse.json(result, { status: statusCode });
  } catch (err) {
    const isCastError = err.name === 'CastError' || 
                        err.message.includes('Cast to ObjectId') || 
                        err.message.includes('BSONError') || 
                        err.message.includes('ObjectId');
    
    if (isCastError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'Invalid ID format for workspace_id or triggered_by.' },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'GENERATION_FAILED', message: err.message },
        meta: { timestamp: new Date().toISOString(), processing_ms: 0 },
      },
      { status: 500 }
    );
  }
}
