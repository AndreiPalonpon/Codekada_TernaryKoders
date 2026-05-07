import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import serviceManager from '@/orchestrator/ServiceManager';
import { authOptions } from '@/lib/auth';
import { getGoogleCalendarEvents } from '@/lib/google/calendar';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import Workspace from '@/models/Workspace';
import mongoose from 'mongoose';

/**
 * Resilient helper to convert placeholder IDs to valid 24-char hex ObjectIds.
 */
function toValidObjectId(id) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return id;
  }
  const clean = String(id || '').replace(/[^0-9a-fA-F]/g, '');
  const padded = clean.padEnd(24, '0').slice(0, 24);
  if (mongoose.Types.ObjectId.isValid(padded)) {
    return padded;
  }
  return new mongoose.Types.ObjectId().toString();
}

/**
 * POST /api/schedule/generate
 *
 * Full two-phase scheduling pipeline:
 *   Phase 1 (The Brain) — Gemini AI extracts structured tasks from multimodal inputs.
 *   Phase 2 (The Hands) — NUserBinPacking slots those tasks into free calendar bins.
 *
 * The AI adapter is obtained via ServiceManager (DI), which wraps it in
 * FallbackAIDecorator for automatic fault tolerance. The scheduler is also
 * provided by ServiceManager for easy future swapping.
 *
 * Request Body (per Internal API spec §4.1):
 * {
 *   workspace_id:     string,
 *   inputs:           [{ type: "text"|"image_base64", content: string }],
 *   user_preferences: { deep_work_hours: string[], max_daily_load_minutes: number }
 * }
 */

// ── Zod Request Validation ──────────────────────────────────────────────────

const GenerateRequestSchema = z.object({
  workspace_id: z.string().min(1, 'workspace_id is required.'),
  inputs: z.array(
    z.object({
      type: z.enum(['text', 'image_base64', 'link', 'document', 'document_base64']),
      content: z.string(),
      name: z.string().optional(),
      mimeType: z.string().optional(),
    })
  ).optional(),
  manual_tasks: z.array(
    z.object({
      task_name: z.string().min(1),
      estimated_minutes: z.number().or(z.string()),
      cognitive_load: z.enum(['Low', 'Medium', 'High']).optional(),
      preferred_window: z.enum(['Morning', 'Afternoon', 'Night']).optional(),
      splittable: z.boolean().optional(),
      start_after: z.string().nullable().optional(),
      deadline: z.string().nullable().optional(),
      fixed_time: z.boolean().optional(),
      priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional()
    })
  ).optional(),
  existing_events: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
    }).passthrough()
  ).optional().default([]),
  user_preferences: z.object({
    deep_work_hours: z.array(z.string()).optional().default(['09:00', '17:00']),
    max_daily_load_minutes: z.number().optional().default(240),
    exclude_times: z.array(z.string()).optional().default([]),
    exclude_days: z.array(z.string()).optional().default([]),
    force_split_tasks: z.boolean().optional().default(false),
  }).optional().default({}),
}).refine(data => {
  return (data.inputs && data.inputs.length > 0) || (data.manual_tasks && data.manual_tasks.length > 0);
}, {
  message: 'Either inputs or manual_tasks must be provided.',
  path: ['inputs']
});

// ── Color palette keyed by cognitive load ────────────────────────────────────
const LOAD_COLORS = {
  High:   { bg: '#10b981', border: '#059669' }, // emerald
  Medium: { bg: '#3b82f6', border: '#2563eb' }, // blue
  Low:    { bg: '#f59e0b', border: '#d97706' }, // amber
};

function schedulerTimeRange() {
  const timeMin = new Date();
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 14);

  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  };
}

/**
 * Returns a color pair for a given cognitive_load label.
 */
function colorForLoad(cognitiveLoad) {
  return LOAD_COLORS[cognitiveLoad] || LOAD_COLORS.Medium;
}

/**
 * Converts the Phase 2 scheduled task array into FullCalendar event objects.
 *
 * Each scheduled task contains one or more schedule_blocks (splittable tasks
 * may span multiple time slots). Every block becomes its own calendar event
 * so FullCalendar renders them individually.
 *
 * @param {Array<Object>} scheduledTasks - Tasks with .metadata and .schedule_blocks[].
 * @returns {Array<Object>} FullCalendar-compatible event array.
 */
function mapScheduledToCalendarEvents(scheduledTasks, currentUserName = 'Current User') {
  const events = [];

  for (const task of scheduledTasks) {
    const color = colorForLoad(task.metadata.cognitive_load);
    const taskId = task._id ? task._id.toString() : `gen_${Date.now()}_${events.length}`;

    let assigneeName = currentUserName;
    if (task.assigned_to) {
      if (typeof task.assigned_to === 'object' && task.assigned_to.name) {
        assigneeName = task.assigned_to.name;
      } else if (task.assigned_to.toString() !== 'user_mvp') {
        assigneeName = currentUserName;
      }
    }

    for (const block of task.schedule_blocks) {
      events.push({
        id: taskId,
        title: task.metadata.task_name,
        start: block.start_time,
        end: block.end_time,
        backgroundColor: color.bg,
        borderColor: color.border,
        extendedProps: {
          description: `<p>Generated by SyncForge AI pipeline.</p>`,
          cognitive_load: task.metadata.cognitive_load,
          estimated_minutes: task.metadata.estimated_minutes,
          preferred_window: task.metadata.preferred_window,
          splittable: task.metadata.splittable,
          assigned_to: assigneeName,
        },
      });
    }
  }

  return events;
}

function mapGoogleEventsToCalendarEvents(googleEvents) {
  return googleEvents.map((event, index) => ({
    id: `gcal_event_${event.id || index}_${event.start}_${event.end}`,
    title: event.title || '(No title)',
    start: event.start,
    end: event.end,
    backgroundColor: '#94a3b8',
    borderColor: '#64748b',
    display: 'block',
    extendedProps: {
      source: 'google_calendar',
      readOnly: true,
      google_event_id: event.id,
      google_link: event.htmlLink,
      description: event.description
        ? `<p>${event.description}</p>`
        : '<p>Imported from Google Calendar.</p>',
    },
  }));
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  const startTime = Date.now();
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } },
      { status: 400 }
    );
  }

  // ── Zod Validation ──────────────────────────────────────────────────────
  const parseResult = GenerateRequestSchema.safeParse(body);
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

  try {
    const { workspace_id, inputs, manual_tasks, existing_events, user_preferences } = parseResult.data;
    const session = await getServerSession(authOptions);

    let aiTasks = [];

    if (manual_tasks && manual_tasks.length > 0) {
      aiTasks = manual_tasks.map(t => ({
        workspace_id: workspace_id,
        assigned_to: 'user_mvp',
        metadata: {
          task_name: t.task_name,
          estimated_minutes: typeof t.estimated_minutes === 'string' ? parseInt(t.estimated_minutes) || 60 : t.estimated_minutes,
          cognitive_load: t.cognitive_load || 'Medium',
          preferred_window: t.preferred_window || 'Morning',
          splittable: t.splittable !== undefined ? t.splittable : true,
          start_after: t.start_after || null,
          deadline: t.deadline || null,
          fixed_time: t.fixed_time || false,
          priority: t.priority || 'P3'
        }
      }));
    } else {
      // ── Parse multimodal inputs into the shapes the AI adapter expects ──
      const textPrompt = (inputs || [])
        .filter((i) => i.type === 'text' || i.type === 'link' || i.type === 'document')
        .map((i) => {
          if (i.type === 'link') return `Attached link: ${i.content}`;
          if (i.type === 'document') return `[Content from uploaded file "${i.name || 'document'}"]: \n${i.content}`;
          return i.content;
        })
        .join('\n\n');

      const base64Images = (inputs || [])
        .filter((i) => i.type === 'image_base64' || i.type === 'document_base64')
        .map((i) => {
          const contentParts = i.content.split(',');
          const mimeType = i.mimeType || (i.content.split(';')[0].replace('data:', '')) || 'application/pdf';
          const base64Data = contentParts[1] || contentParts[0];
          return {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          };
        });

      // ── Phase 1: The Brain (Gemini AI) ──────────────────────────────────
      // ServiceManager provides FallbackAIDecorator(geminiAdapter).
      // If the Gemini API is unavailable, the decorator catches and returns [].
      const aiService = await serviceManager.getAIService();
      
      console.log("\n==========================================");
      console.log("[ROUTE LOGS] Initiating AI Phase 1...");
      console.log(`- Base64 Images Count: ${base64Images.length}`);
      console.log(`- Text Prompt preview: ${textPrompt.slice(0, 100)}...`);
      console.log("==========================================\n");

      aiTasks = await aiService.generateStandard(
        workspace_id,
        'user_mvp',        // MVP: hardcoded user ID until auth is wired
        user_preferences,
        textPrompt,
        base64Images
      );
      
      console.log("\n==========================================");
      console.log("[ROUTE LOGS] AI Phase 1 Completed.");
      console.log(`- Parsed Task Count: ${aiTasks?.length || 0}`);
      console.log(`- Parsed Tasks Metadata preview:`, JSON.stringify(aiTasks.map(t => t.metadata?.task_name), null, 2));
      console.log("==========================================\n");
    }

    // If the AI returned no tasks (empty input or fallback), return early.
    if (!aiTasks || aiTasks.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            processing_ms: Date.now() - startTime,
            ai_tasks: [],
          },
        },
        { status: 200 }
      );
    }

    // ── Phase 2: The Hands (NUserBinPacking Scheduler) ──────────────────
    // Maps local app events and Google Calendar free/busy blocks into the
    // scheduler's busy shape so generated tasks land in real open gaps.
    const localBusyBlocks = existing_events.map(ev => ({
      start: ev.start,
      end: ev.end,
    }));

    let googleCalendarEvents = [];
    let googleCalendarSync = 'skipped';

    if (session?.user?.email) {
      try {
        const { timeMin, timeMax } = schedulerTimeRange();
        googleCalendarEvents = await getGoogleCalendarEvents({
          email: session.user.email,
          timeMin,
          timeMax,
        });
        googleCalendarSync = 'connected';
      } catch (calendarError) {
        console.warn('Google Calendar busy fetch failed:', calendarError.message);
        googleCalendarSync = 'failed';
      }
    }

    const googleBusyBlocks = googleCalendarEvents.map((event) => ({
      start: event.start,
      end: event.end,
    }));
    const busyBlocks = [...localBusyBlocks, ...googleBusyBlocks];

    const scheduler = serviceManager.getScheduler();
    const { scheduled, unscheduled, full } = scheduler.schedule(
      aiTasks,
      [{ busy: busyBlocks }],
      {
        work_day_start:       user_preferences?.deep_work_hours?.[0] || '09:00',
        work_day_end:         user_preferences?.deep_work_hours?.[1] || '17:00',
        deep_work_max_minutes: user_preferences?.max_daily_load_minutes || 240,
        buffer_minutes:       15,
        exclude_times:        user_preferences?.exclude_times || [],
        exclude_days:         user_preferences?.exclude_days || [],
        force_split_tasks:    user_preferences?.force_split_tasks || false,
      }
    );

    // ── Persist generated tasks to MongoDB ──────────────────────────────
    await dbConnect();
    const validWorkspaceId = toValidObjectId(workspace_id);
    const userId = session?.user?.id || toValidObjectId('user_mvp');

    const savedTasks = [];
    for (const t of scheduled) {
      const dbTask = await Task.create({
        workspace_id: validWorkspaceId,
        assigned_to: userId,
        metadata: {
          task_name: t.metadata.task_name,
          estimated_minutes: t.metadata.estimated_minutes,
          cognitive_load: t.metadata.cognitive_load,
          preferred_window: t.metadata.preferred_window,
          splittable: t.metadata.splittable,
          start_after: t.metadata.start_after || null,
          deadline: t.metadata.deadline || null,
          priority: t.metadata.priority || 'P3',
          depends_on: t.metadata.depends_on || null,
          fixed_time: t.metadata.fixed_time || false,
          recurrence: t.metadata.recurrence || null,
        },
        status: 'Scheduled',
        schedule_blocks: t.schedule_blocks.map(b => ({
          start_time: new Date(b.start_time),
          end_time: new Date(b.end_time),
          calendar_event_id: b.calendar_event_id,
        })),
      });
      savedTasks.push(dbTask);
    }

    // ── Map to FullCalendar events ──────────────────────────────────────

    const currentUserName = session?.user?.name || 'Current User';
    const calendarEvents = [
      ...mapGoogleEventsToCalendarEvents(googleCalendarEvents),
      ...mapScheduledToCalendarEvents(savedTasks, currentUserName),
    ];

    const processingMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: true,
        data: calendarEvents,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          processing_ms: processingMs,
          ai_tasks: aiTasks,  // Phase 1 raw output for TaskBreakdown display
          google_calendar: {
            status: googleCalendarSync,
            busy_blocks: googleCalendarEvents.length,
          },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'GENERATION_FAILED', message: err.message },
        meta: { timestamp: new Date().toISOString(), processing_ms: Date.now() - startTime },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/schedule/generate
 *
 * Retrieves all stored tasks for a workspace and maps them to calendar events.
 */
export async function GET(request) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const workspaceIdInput = searchParams.get('workspace_id');

    if (!workspaceIdInput) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'BAD_REQUEST', message: 'workspace_id is required.' } },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } },
        { status: 401 }
      );
    }

    await dbConnect();
    const validWorkspaceId = toValidObjectId(workspaceIdInput);

    // Find all scheduled or snoozed tasks for this workspace
    const dbTasks = await Task.find({
      workspace_id: validWorkspaceId,
      status: { $in: ['Scheduled', 'Snoozed', 'Pending'] },
    }).populate('assigned_to', 'name');

    const aiTasks = [];
    const calendarEvents = [];
    const currentUserName = session?.user?.name || 'Current User';

    for (const task of dbTasks) {
      // Build Phase 1 metadata lists
      aiTasks.push({
        _id: task._id.toString(),
        metadata: {
          task_name: task.metadata.task_name,
          estimated_minutes: task.metadata.estimated_minutes,
          cognitive_load: task.metadata.cognitive_load,
          preferred_window: task.metadata.preferred_window,
          splittable: task.metadata.splittable,
          start_after: task.metadata.start_after,
          deadline: task.metadata.deadline,
          priority: task.metadata.priority,
          depends_on: task.metadata.depends_on,
          fixed_time: task.metadata.fixed_time,
          recurrence: task.metadata.recurrence,
        },
      });

      const color = colorForLoad(task.metadata.cognitive_load);
      let assigneeName = currentUserName;
      if (task.assigned_to) {
        if (typeof task.assigned_to === 'object' && task.assigned_to.name) {
          assigneeName = task.assigned_to.name;
        } else if (task.assigned_to.toString() !== 'user_mvp') {
          assigneeName = currentUserName;
        }
      }

      for (const block of task.schedule_blocks) {
        calendarEvents.push({
          id: task._id.toString(),
          title: task.metadata.task_name,
          start: block.start_time,
          end: block.end_time,
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: {
            description: `<p>Loaded from SyncForge Database.</p>`,
            cognitive_load: task.metadata.cognitive_load,
            estimated_minutes: task.metadata.estimated_minutes,
            preferred_window: task.metadata.preferred_window,
            splittable: task.metadata.splittable,
            assigned_to: assigneeName,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: calendarEvents,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        processing_ms: Date.now() - startTime,
        ai_tasks: aiTasks,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, data: null, error: { code: 'FETCH_TASKS_FAILED', message: err.message } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/schedule/generate
 *
 * Deletes a task by its ID in MongoDB.
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
        { success: false, data: null, error: { code: 'BAD_REQUEST', message: 'Task ID is required.' } },
        { status: 400 }
      );
    }

    await dbConnect();
    const validTaskId = toValidObjectId(id);

    // Only allow deletion of tasks belonging to workspaces where user is present
    const taskToDelete = await Task.findById(validTaskId);
    if (!taskToDelete) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Task not found.' } },
        { status: 404 }
      );
    }

    const parentWorkspace = await Workspace.findOne({
      _id: taskToDelete.workspace_id,
      'members.user_id': session.user.id,
    });

    if (!parentWorkspace) {
      // Fallback: If the workspace document doesn't exist in MongoDB (e.g. ad-hoc/MVP workspace),
      // allow deletion if the task is assigned to the current user to prevent orphaned items.
      if (taskToDelete.assigned_to.toString() !== session.user.id.toString()) {
        return NextResponse.json(
          { success: false, data: null, error: { code: 'FORBIDDEN', message: 'You do not have access to this task.' } },
          { status: 403 }
        );
      }
    }

    await Task.deleteOne({ _id: validTaskId });

    return NextResponse.json({
      success: true,
      data: { id },
      error: null,
      meta: { timestamp: new Date().toISOString(), processing_ms: Date.now() - startTime },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, data: null, error: { code: 'DELETE_TASK_FAILED', message: err.message } },
      { status: 500 }
    );
  }
}
