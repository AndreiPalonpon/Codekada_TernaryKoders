import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Workspace from '@/models/Workspace';

/**
 * GET /api/workspaces
 *
 * Fetches all workspaces where the current authenticated user is a member.
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } },
        { status: 401 }
      );
    }

    await dbConnect();
    
    // Find workspaces where the user is in the members array.
    const workspaces = await Workspace.find({
      'members.user_id': session.user.id
    }).sort({ updatedAt: -1 });

    // Map to the shape the frontend expects.
    const formatted = workspaces.map(ws => ({
      id: ws._id.toString(),
      name: ws.workspace_name,
      type: ws.members.find(m => m.user_id.toString() === session.user.id)?.role === 'Owner' ? 'Personal' : 'Team Workspace',
      color: "bg-emerald-500", // Cycle colors in the UI if needed
      iconName: "FolderKanban",
      createdAt: ws.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      error: null,
      meta: { timestamp: new Date().toISOString(), processing_ms: Date.now() - startTime },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, data: null, error: { code: 'FETCH_FAILED', message: err.message } },
      { status: 500 }
    );
  }
}

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
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'You must be signed in to create workspaces.' } },
        { status: 401 }
      );
    }

    await dbConnect();

    const dbWorkspace = await Workspace.create({
      workspace_name,
      members: [
        {
          user_id: session.user.id,
          role: 'Owner',
          joined_at: new Date(),
        }
      ],
      analytics: {
        total_tasks_created: 0,
        total_deep_work_hours: 0,
      }
    });

    const processingMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: true,
        data: dbWorkspace,
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

/**
 * PATCH /api/workspaces
 *
 * Renames a workspace in MongoDB.
 */
export async function PATCH(request) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name } = body;
    if (!id || !name) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'BAD_REQUEST', message: 'ID and name are required.' } },
        { status: 400 }
      );
    }

    await dbConnect();

    const ws = await Workspace.findOneAndUpdate(
      { _id: id, 'members.user_id': session.user.id },
      { workspace_name: name },
      { new: true }
    );

    if (!ws) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'NOT_FOUND_OR_FORBIDDEN', message: 'Workspace not found or unauthorized.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ws,
      error: null,
      meta: { timestamp: new Date().toISOString(), processing_ms: Date.now() - startTime },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, data: null, error: { code: 'PATCH_FAILED', message: err.message } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces
 *
 * Deletes a workspace and its associated records in MongoDB.
 */
export async function DELETE(request) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'BAD_REQUEST', message: 'Workspace ID is required.' } },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Only owner can delete
    const result = await Workspace.deleteOne({
      _id: id,
      'members.user_id': session.user.id,
      'members.role': 'Owner'
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'NOT_FOUND_OR_FORBIDDEN', message: 'Workspace not found or unauthorized.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id },
      error: null,
      meta: { timestamp: new Date().toISOString(), processing_ms: Date.now() - startTime },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, data: null, error: { code: 'DELETE_FAILED', message: err.message } },
      { status: 500 }
    );
  }
}

