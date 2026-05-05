import { addMinutes, formatISO, startOfDay, addDays } from 'date-fns';
import ISchedulerEngine from './ISchedulerEngine.js';

/**
 * NUserBinPacking
 *
 * The deterministic scheduling engine ("The Hands").
 * This is a pure function class — it takes inputs and produces outputs with zero side effects.
 * It works for 1 to N users. For MVP, N = 1 (single user). When MULTI_USER_ENABLED is true,
 * N > 1 and the engine finds overlapping free windows across all team members' calendars.
 *
 * Algorithm: Greedy Bin-Packing
 * - Merges busy blocks from all user calendars.
 * - Generates free "bins" within each user's working hours.
 * - Sorts tasks by priority (P1 first) and due_date to ensure urgent work gets scheduled first.
 * - Fits tasks into the earliest matching free bin. Splits splittable tasks if needed.
 */
class NUserBinPacking extends ISchedulerEngine {

  /**
   * @param {number} [lookAheadDays=7] - How many days ahead to search for free time.
   */
  constructor(lookAheadDays = 7) {
    super();
    this.lookAheadDays = lookAheadDays;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Main entry point. Schedules all tasks into free calendar bins.
   *
   * @param {Array<Object>} tasks      - Array of Task documents (from Mongoose).
   * @param {Array<Object>} calendars  - Array of { busy: [{ start, end }] } objects, one per user.
   * @param {Object}        userPrefs  - { work_day_start, work_day_end, timezone, deep_work_max_minutes, buffer_minutes }
   * @returns {{ scheduled: Array, unscheduled: Array, full: boolean }}
   */
  schedule(tasks, calendars, userPrefs) {
    const {
      work_day_start = '09:00',
      work_day_end = '17:00',
      timezone = 'UTC',
      deep_work_max_minutes = 240,
      buffer_minutes = 15,
    } = userPrefs;

    if (!tasks || tasks.length === 0) {
      return { scheduled: [], unscheduled: [], full: false };
    }

    // Step 1: Build a merged list of all busy blocks across all calendars.
    const allBusyBlocks = this._mergeAndSortBusyBlocks(calendars);

    // Step 2: Generate all free bins within the look-ahead window.
    const freeBins = this._generateFreeBins(
      allBusyBlocks,
      work_day_start,
      work_day_end,
      timezone,
      buffer_minutes
    );

    if (freeBins.length === 0) {
      return { scheduled: [], unscheduled: tasks, full: true };
    }

    // Step 3: Sort tasks by urgency (P1 > P2 > P3 > P4, then by due_date).
    const sortedTasks = this._sortTasksByUrgency(tasks);

    // Step 4: Greedily fit each task into the earliest matching free bin.
    const scheduled = [];
    const unscheduled = [];

    for (const task of sortedTasks) {
      const result = this._fitTaskIntoBins(task, freeBins, deep_work_max_minutes, buffer_minutes);

      if (result.blocks.length > 0) {
        scheduled.push({ ...task, schedule_blocks: result.blocks });
      } else {
        unscheduled.push(task);
      }
    }

    return { scheduled, unscheduled, full: unscheduled.length > 0 };
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Merges and sorts busy blocks from all N user calendars into a single sorted array.
   * For team scheduling, a time is "busy" if ANY member is busy during it.
   */
  _mergeAndSortBusyBlocks(calendars) {
    const allBlocks = [];

    for (const calendar of calendars) {
      for (const block of (calendar.busy || [])) {
        allBlocks.push({
          start: new Date(block.start),
          end: new Date(block.end),
        });
      }
    }

    // Sort by start time, then merge overlapping blocks.
    allBlocks.sort((a, b) => a.start - b.start);

    const merged = [];
    for (const block of allBlocks) {
      if (merged.length === 0 || block.start > merged[merged.length - 1].end) {
        merged.push({ start: block.start, end: block.end });
      } else {
        // Overlapping — extend the last merged block's end if needed.
        merged[merged.length - 1].end = new Date(
          Math.max(merged[merged.length - 1].end, block.end)
        );
      }
    }

    return merged;
  }

  /**
   * Scans the look-ahead window day by day.
   * For each day, starts at work_day_start and carves out free bins around busy blocks.
   * Returns an array of mutable { start, end, remainingMinutes } objects.
   */
  _generateFreeBins(busyBlocks, workStart, workEnd, timezone, bufferMinutes) {
    const freeBins = [];
    const now = new Date();

    for (let dayOffset = 0; dayOffset < this.lookAheadDays; dayOffset++) {
      const dayBase = startOfDay(addDays(now, dayOffset));

      // Parse work hours as UTC-aware dates for this day.
      const [startH, startM] = workStart.split(':').map(Number);
      const [endH, endM] = workEnd.split(':').map(Number);

      const dayStart = new Date(dayBase);
      dayStart.setHours(startH, startM, 0, 0);

      const dayEnd = new Date(dayBase);
      dayEnd.setHours(endH, endM, 0, 0);

      // Skip days that are entirely in the past.
      if (dayEnd < now) continue;

      // Collect busy blocks that fall within this working day.
      const dayBusy = busyBlocks.filter(
        (b) => b.start < dayEnd && b.end > dayStart
      );

      // Carve free windows around the busy blocks within working hours.
      let cursor = dayStart < now ? now : dayStart;

      for (const busy of dayBusy) {
        const freeEnd = busy.start < dayEnd ? busy.start : dayEnd;

        if (cursor < freeEnd) {
          const gapMinutes = (freeEnd - cursor) / 60000;
          if (gapMinutes > bufferMinutes) {
            freeBins.push({ start: new Date(cursor), end: new Date(freeEnd), remainingMinutes: gapMinutes });
          }
        }

        // Advance cursor past this busy block, plus the mandatory buffer.
        const afterBusy = addMinutes(busy.end, bufferMinutes);
        cursor = afterBusy > cursor ? afterBusy : cursor;
      }

      // Add a final free window from the last busy block to end of work day.
      if (cursor < dayEnd) {
        const gapMinutes = (dayEnd - cursor) / 60000;
        if (gapMinutes > bufferMinutes) {
          freeBins.push({ start: new Date(cursor), end: new Date(dayEnd), remainingMinutes: gapMinutes });
        }
      }
    }

    return freeBins;
  }

  /**
   * Sorts tasks with P1 (most urgent) first. Tasks with due_dates take precedence over those without.
   */
  _sortTasksByUrgency(tasks) {
    const priorityWeight = { P1: 1, P2: 2, P3: 3, P4: 4 };

    return [...tasks].sort((a, b) => {
      const pA = priorityWeight[a.metadata?.priority] ?? 3;
      const pB = priorityWeight[b.metadata?.priority] ?? 3;

      if (pA !== pB) return pA - pB;

      // Same priority — prefer tasks with sooner due dates.
      const dA = a.metadata?.due_date ? new Date(a.metadata.due_date) : Infinity;
      const dB = b.metadata?.due_date ? new Date(b.metadata.due_date) : Infinity;
      return dA - dB;
    });
  }

  /**
   * Greedily fits a single task into the earliest available free bins.
   * For splittable tasks, it can span across multiple bins.
   * For non-splittable tasks, it finds the first single bin large enough.
   *
   * Enforces the deep_work_max_minutes cap per block.
   */
  _fitTaskIntoBins(task, freeBins, deepWorkMaxMinutes, bufferMinutes) {
    const needed = task.metadata?.estimated_minutes ?? 0;
    const splittable = task.metadata?.splittable ?? false;
    const isCognitivelyHeavy = task.metadata?.cognitive_load === 'High';

    // For High cognitive load, cap each block at deep_work_max_minutes.
    const maxBlockSize = isCognitivelyHeavy ? deepWorkMaxMinutes : Infinity;

    const blocks = [];
    let remainingMinutes = needed;

    for (const bin of freeBins) {
      if (remainingMinutes <= 0) break;

      // Skip bins with no remaining capacity.
      if (bin.remainingMinutes <= bufferMinutes) continue;

      const canFitInBin = Math.min(bin.remainingMinutes, maxBlockSize, remainingMinutes);

      if (!splittable && canFitInBin < remainingMinutes) {
        // Non-splittable: this bin is too small, keep looking.
        continue;
      }

      // Carve out the block from the front of this bin.
      const blockStart = new Date(bin.end.getTime() - bin.remainingMinutes * 60000);
      const blockEnd = addMinutes(blockStart, canFitInBin);

      blocks.push({
        start_time: formatISO(blockStart),
        end_time: formatISO(blockEnd),
        calendar_event_id: null, // Will be filled by the Google Calendar adapter.
      });

      bin.remainingMinutes -= canFitInBin;
      remainingMinutes -= canFitInBin;

      if (!splittable) break; // Non-splittable: one block is enough once found.
    }

    // If we couldn't schedule all of it, don't return a partial result for non-splittable.
    if (!splittable && remainingMinutes > 0) {
      return { blocks: [] };
    }

    return { blocks };
  }
}

export default NUserBinPacking;
