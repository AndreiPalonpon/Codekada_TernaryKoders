import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import Workspace from '@/models/Workspace';
import User from '@/models/User';
import serviceManager from './ServiceManager.js';

/**
 * PipelineFacade
 *
 * The single entry point for all schedule-related operations.
 * Frontend API routes call this class; they never interact directly with services.
 *
 * Responsibilities:
 * - Orchestrate the sequence: DB fetch -> Scheduler -> DB persist -> Real-time broadcast.
 * - For the Generation Pipeline, it accepts pre-parsed AI output (the task JSON array).
 * - For the Recalculation pipeline, it fetches existing tasks and re-runs the scheduler.
 */
class PipelineFacade {

  /**
   * Generates a new schedule for a workspace.
   *
   * This is called by POST /api/schedule/generate.
   * It assumes the AI has already been called and the enriched task array is passed in.
   *
   * @param {string}        workspaceId  - The ID of the target workspace.
   * @param {Array<Object>} taskPayloads - Array of AI-enriched task metadata objects.
   * @param {Array<Object>} busyBlocks   - Array of { busy: [{ start, end }] } objects per user.
   * @param {string}        triggeredBy  - User ID of who triggered the generation.
   * @returns {Object}                   - Standardized API response object.
   */
  async generateSchedule(workspaceId, taskPayloads, busyBlocks, triggeredBy) {
    const startTime = Date.now();

    await dbConnect();

    // Fetch workspace and the primary user's preferences for scheduling.
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return this._errorResponse('WORKSPACE_NOT_FOUND', `Workspace ${workspaceId} not found.`);
    }

    const ownerMember = workspace.members.find((m) => m.role === 'Owner');
    const user = ownerMember ? await User.findById(ownerMember.user_id) : null;
    const userPrefs = user?.preferences?.toObject() ?? {};

    // Run the deterministic bin-packing algorithm.
    const scheduler = serviceManager.getScheduler();
    const { scheduled, unscheduled, full } = scheduler.schedule(taskPayloads, busyBlocks, userPrefs);

    // Persist all scheduled tasks to the database.
    const createdTasks = [];
    for (const task of scheduled) {
      const newTask = await Task.create({
        workspace_id: workspaceId,
        assigned_to: task.assigned_to || ownerMember?.user_id,
        metadata: task.metadata,
        depends_on: task.depends_on ?? [],
        status: 'Scheduled',
        schedule_blocks: task.schedule_blocks,
      });
      createdTasks.push(newTask);
    }

    // Broadcast the update to all connected clients in this workspace.
    const syncService = await serviceManager.getSyncService();
    await syncService.broadcastUpdate(workspaceId, {
      event_id: `evt_${Date.now()}`,
      triggered_by: triggeredBy,
      action_type: 'generation',
      new_schedule_state: createdTasks,
    });

    const processingMs = Date.now() - startTime;
    return this._successResponse(
      { scheduled: createdTasks, unscheduled, full },
      processingMs
    );
  }

  /**
   * Recalculates the schedule for a workspace after an interruption (e.g., Snooze).
   *
   * This is called by PATCH /api/schedule/recalculate.
   * It skips the AI entirely — only the JS math runs.
   *
   * @param {string}        workspaceId        - The ID of the target workspace.
   * @param {string}        interruptedTaskId  - Task ID that was interrupted.
   * @param {string}        action             - The interruption type: 'snooze' | 'missed'.
   * @param {number}        delayMinutes       - How many minutes to snooze by (for snooze action).
   * @param {Array<Object>} busyBlocks         - Fresh calendar busy blocks.
   * @param {string}        triggeredBy        - User ID of who triggered the recalculation.
   * @returns {Object}                         - Standardized API response object.
   */
  async recalculateSchedule(workspaceId, interruptedTaskId, action, delayMinutes, busyBlocks, triggeredBy) {
    const startTime = Date.now();

    await dbConnect();

    // Mark the interrupted task as snoozed or pending.
    const interruptedTask = await Task.findById(interruptedTaskId);
    if (!interruptedTask) {
      return this._errorResponse('TASK_NOT_FOUND', `Task ${interruptedTaskId} not found.`);
    }

    if (action === 'snooze') {
      interruptedTask.status = 'Snoozed';
      interruptedTask.schedule_blocks = []; // Clear its current block — will be re-scheduled.
    } else if (action === 'missed') {
      interruptedTask.status = 'Pending';
      interruptedTask.schedule_blocks = [];
    }
    await interruptedTask.save();

    // Fetch all remaining Pending/Snoozed tasks for this workspace to re-pack.
    const pendingTasks = await Task.find({
      workspace_id: workspaceId,
      status: { $in: ['Pending', 'Snoozed'] },
    }).lean();

    if (pendingTasks.length === 0) {
      return this._successResponse({ scheduled: [], unscheduled: [], full: false }, Date.now() - startTime);
    }

    // Fetch user preferences.
    const workspace = await Workspace.findById(workspaceId);
    const ownerMember = workspace?.members.find((m) => m.role === 'Owner');
    const user = ownerMember ? await User.findById(ownerMember.user_id) : null;
    const userPrefs = user?.preferences?.toObject() ?? {};

    // Re-run the scheduler on all remaining tasks.
    const scheduler = serviceManager.getScheduler();
    const { scheduled, unscheduled, full } = scheduler.schedule(pendingTasks, busyBlocks, userPrefs);

    // Persist the rescheduled blocks.
    for (const task of scheduled) {
      await Task.findByIdAndUpdate(task._id, {
        status: 'Scheduled',
        schedule_blocks: task.schedule_blocks,
      });
    }

    // Broadcast the recalculation.
    const syncService = await serviceManager.getSyncService();
    await syncService.broadcastUpdate(workspaceId, {
      event_id: `evt_${Date.now()}`,
      triggered_by: triggeredBy,
      action_type: 'recalculation',
      new_schedule_state: scheduled,
    });

    const processingMs = Date.now() - startTime;
    return this._successResponse({ scheduled, unscheduled, full }, processingMs);
  }

  // ---------------------------------------------------------------------------
  // Private Response Helpers (Standardized API Envelope)
  // ---------------------------------------------------------------------------

  _successResponse(data, processingMs) {
    return {
      success: true,
      data,
      error: null,
      meta: { timestamp: new Date().toISOString(), processing_ms: processingMs },
    };
  }

  _errorResponse(code, message) {
    return {
      success: false,
      data: null,
      error: { code, message },
      meta: { timestamp: new Date().toISOString(), processing_ms: 0 },
    };
  }
}

export default new PipelineFacade();
