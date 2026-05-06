import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * POST /api/workspaces
 *
 * Creates a new collaborative workspace (Environment) document.
 * MVP: Returns a generated workspace object without MongoDB persistence.
 * When the database is connected, this will delegate to PipelineFacade
 * for Mongoose document creation and Pusher broadcast.
 *
 * Request Body (per Internal API spec §4.3):
 * {
 *   workspace_name: string,
 *   invited_user_emails: string[]
 * }
 */

const CreateWorkspaceSchema = z.object({
  workspace_name: z.string().min(1, 'Workspace name is required.'),
  invited_user_emails: z.array(z.string().email()).optional().default([]),
});

export async function POST(request) {
  const startTime = Date.now();
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' },
      },
      { status: 400 }
    );
  }

  const parseResult = CreateWorkspaceSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: parseResult.error.issues[0].message,
        },
      },
      { status: 400 }
    );
  }

  const { workspace_name, invited_user_emails } = parseResult.data;

  try {
    // MVP: Generate an in-memory workspace object.
    // When MongoDB is wired, replace this with:
    //   await dbConnect();
    //   const workspace = await Workspace.create({ ... });
    const workspace = {
      _id: `ws_${Date.now()}`,
      workspace_name,
      members: [
        {
          user_id: 'user_mvp',
          role: 'Owner',
          joined_at: new Date().toISOString(),
        },
        ...invited_user_emails.map((email) => ({
          user_id: email,
          role: 'Editor',
          joined_at: new Date().toISOString(),
        })),
      ],
      analytics: {
        total_tasks_created: 0,
        total_deep_work_hours: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const processingMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: true,
        data: workspace,
        error: null,
        meta: { timestamp: new Date().toISOString(), processing_ms: processingMs },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'WORKSPACE_CREATION_FAILED', message: err.message },
        meta: { timestamp: new Date().toISOString(), processing_ms: Date.now() - startTime },
      },
      { status: 500 }
    );
  }
}
