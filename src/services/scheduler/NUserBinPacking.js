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
 * Algorithm: Greedy Bin-Packing with Chronological Constraints
 * - Merges busy blocks from all user calendars.
 * - Generates free "bins" within each user's working hours.
 * - Sorts tasks by deadline urgency (earliest deadline first), then priority.
 * - Fits tasks into the earliest VALID free bin, strictly respecting:
 *     • start_after — bins before this date are skipped.
 *     • deadline    — bins after this date are excluded.
 * - Splits splittable tasks if needed.
 */
class NUserBinPacking extends ISchedulerEngine {

  /**
   * @param {number} [lookAheadDays=14] - How many days ahead to search for free time.
   */
  constructor(lookAheadDays = 14) {
    super();
    this.lookAheadDays = lookAheadDays;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Main entry point. Schedules all tasks into free calendar bins.
   *
   * @param {Array<Object>} tasks      - Array of Task documents (from Mongoose or AI output).
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
      exclude_times = [],
      exclude_days = [],
      force_split_tasks = false,
    } = userPrefs;

    if (!tasks || tasks.length === 0) {
      return { scheduled: [], unscheduled: [], full: false };
    }

    const recurringTasks = tasks.filter(t => t.metadata?.recurrence != null);
    const oneOffTasks = tasks.filter(t => t.metadata?.recurrence == null);

    const scheduledRecurring = [];
    const recurringConstraints = [];

    // Step 1: Project recurring tasks up to 30 days and treat as hard constraints
    for (const rTask of recurringTasks) {
      const blocks = this._projectRecurringTask(rTask, Math.max(30, this.lookAheadDays), userPrefs);
      scheduledRecurring.push({ ...rTask, schedule_blocks: blocks });
      
      for (const block of blocks) {
        recurringConstraints.push({
          start: new Date(block.start_time),
          end: new Date(block.end_time)
        });
      }
    }

    // Convert exclude_times into daily busy blocks pattern
    const recurringBusyBlocks = exclude_times.map(timeRange => {
      const [start, end] = timeRange.split('-');
      return { startStr: start.trim(), endStr: end.trim() };
    });

    // Step 2: Build a merged list of all busy blocks (calendars + projected recurring tasks).
    const allBusyBlocks = this._mergeAndSortBusyBlocks(calendars);
    allBusyBlocks.push(...recurringConstraints);
    allBusyBlocks.sort((a, b) => a.start - b.start);

    // Step 3: Generate all free bins within the look-ahead window.
    const freeBins = this._generateFreeBins(
      allBusyBlocks,
      work_day_start,
      work_day_end,
      timezone,
      buffer_minutes,
      exclude_days,
      recurringBusyBlocks
    );

    if (freeBins.length === 0) {
      return { scheduled: scheduledRecurring, unscheduled: oneOffTasks, full: true };
    }

    // Step 4: Sort one-off tasks by deadline urgency, then by priority.
    const sortedOneOffTasks = this._sortTasksByUrgency(oneOffTasks);

    // Step 5: Greedily fit each one-off task into the earliest VALID free bin.
    const scheduled = [...scheduledRecurring];
    const unscheduled = [];

    for (const task of sortedOneOffTasks) {
      const result = this._fitTaskIntoBins(task, freeBins, deep_work_max_minutes, buffer_minutes, force_split_tasks);

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
  _generateFreeBins(busyBlocks, workStart, workEnd, timezone, bufferMinutes, excludeDays, recurringBusyBlocks) {
    const freeBins = [];
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let dayOffset = 0; dayOffset < this.lookAheadDays; dayOffset++) {
      const dayBase = startOfDay(addDays(now, dayOffset));
      const currentDayName = dayNames[dayBase.getDay()];

      // Skip excluded days
      if (excludeDays.includes(currentDayName)) continue;

      // Parse work hours as UTC-aware dates for this day.
      const [startH, startM] = workStart.split(':').map(Number);
      const [endH, endM] = workEnd.split(':').map(Number);

      const dayStart = new Date(dayBase);
      dayStart.setHours(startH, startM, 0, 0);

      const dayEnd = new Date(dayBase);
      dayEnd.setHours(endH, endM, 0, 0);

      // Skip days that are entirely in the past.
      if (dayEnd < now) continue;

      // Inject recurring busy blocks (exclude_times) for this day
      const dailyBusy = [...busyBlocks];
      for (const req of recurringBusyBlocks) {
        const [rStartH, rStartM] = req.startStr.split(':').map(Number);
        const [rEndH, rEndM] = req.endStr.split(':').map(Number);
        const reqStart = new Date(dayBase); reqStart.setHours(rStartH, rStartM, 0, 0);
        const reqEnd = new Date(dayBase); reqEnd.setHours(rEndH, rEndM, 0, 0);
        dailyBusy.push({ start: reqStart, end: reqEnd });
      }

      // Collect busy blocks that fall within this working day.
      const dayBusy = dailyBusy.filter(
        (b) => b.start < dayEnd && b.end > dayStart
      ).sort((a, b) => a.start - b.start);

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
   * Sorts tasks by deadline urgency first (earliest deadlines scheduled first),
   * then by priority weight (P1 > P2 > P3 > P4).
   *
   * Tasks with deadlines always come before tasks without deadlines,
   * ensuring time-constrained work gets the best bin placement.
   */
  _sortTasksByUrgency(tasks) {
    const priorityWeight = { P1: 1, P2: 2, P3: 3, P4: 4 };

    return [...tasks].sort((a, b) => {
      const deadlineA = a.metadata?.deadline ? new Date(a.metadata.deadline) : null;
      const deadlineB = b.metadata?.deadline ? new Date(b.metadata.deadline) : null;

      // Tasks with deadlines go before tasks without deadlines.
      if (deadlineA && !deadlineB) return -1;
      if (!deadlineA && deadlineB) return 1;

      // Both have deadlines: earlier deadline first.
      if (deadlineA && deadlineB) {
        const diff = deadlineA - deadlineB;
        if (diff !== 0) return diff;
      }

      // Same deadline (or both null): sort by priority.
      const pA = priorityWeight[a.metadata?.priority] ?? 3;
      const pB = priorityWeight[b.metadata?.priority] ?? 3;
      if (pA !== pB) return pA - pB;

      // Same priority — prefer tasks with sooner start_after dates.
      const sA = a.metadata?.start_after ? new Date(a.metadata.start_after) : new Date(0);
      const sB = b.metadata?.start_after ? new Date(b.metadata.start_after) : new Date(0);
      return sA - sB;
    });
  }

  /**
   * Projects a recurring task over a specified time horizon to generate fixed schedule blocks.
   * @param {Object} task - The recurring task object.
   * @param {number} lookAheadDays - Number of days to project forward.
   * @param {Object} userPrefs - Contains work_day_start.
   * @returns {Array<Object>} Projected schedule blocks.
   */
  _projectRecurringTask(task, lookAheadDays, userPrefs) {
    const blocks = [];
    const recurrence = task.metadata?.recurrence;
    if (!recurrence) return blocks;

    const freq = recurrence.frequency || "DAILY";
    const interval = recurrence.interval || 1;
    const daysOfWeek = recurrence.days_of_week || [];
    const duration = task.metadata.estimated_minutes || 60;
    
    // Reference time: use start_after if provided, else userPrefs.work_day_start or 09:00
    let baseTime = new Date();
    if (task.metadata.start_after) {
       const parsed = new Date(task.metadata.start_after);
       if (!isNaN(parsed.getTime())) {
          baseTime = parsed;
       }
    } else {
       const [h, m] = (userPrefs.work_day_start || '09:00').split(':').map(Number);
       baseTime.setHours(h, m, 0, 0);
    }

    const now = new Date();
    let currentDayIter = new Date(baseTime);
    if (currentDayIter < now) {
       // if baseTime is past, align to today but keep time
       currentDayIter = new Date();
       currentDayIter.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);
    }

    const limit = addDays(now, Math.max(30, lookAheadDays));
    const dayMap = { "SU": 0, "MO": 1, "TU": 2, "WE": 3, "TH": 4, "FR": 5, "SA": 6 };

    let daysPassed = 0;

    while (currentDayIter < limit) {
      let isMatch = false;

      if (freq === "DAILY") {
        if (daysPassed % interval === 0) isMatch = true;
      } else if (freq === "WEEKLY") {
        const weekNum = Math.floor(daysPassed / 7);
        if (weekNum % interval === 0) {
           const dName = currentDayIter.getDay();
           if (daysOfWeek.length === 0 || daysOfWeek.map(d => dayMap[d]).includes(dName)) {
             isMatch = true;
           }
        }
      } else if (freq === "MONTHLY") {
        if (currentDayIter.getDate() === baseTime.getDate()) {
           isMatch = true;
        }
      }

      if (isMatch) {
         const blockStart = new Date(currentDayIter);
         const blockEnd = addMinutes(blockStart, duration);
         blocks.push({
           start_time: formatISO(blockStart),
           end_time: formatISO(blockEnd),
           calendar_event_id: null,
           is_recurring: true
         });
      }

      currentDayIter = addDays(currentDayIter, 1);
      daysPassed++;
    }

    return blocks;
  }

  /**
   * Greedily fits a single task into the earliest available free bin that
   * falls within the task's [start_after, deadline] window.
   *
   * For splittable tasks, it can span across multiple valid bins.
   * For non-splittable tasks, it finds the first single bin large enough.
   *
   * Enforces the deep_work_max_minutes cap per block.
   *
   * CHRONOLOGICAL CONSTRAINTS:
   * - If task.metadata.start_after is set, bins ending before that date are skipped.
   * - If task.metadata.deadline is set, bins starting after that date are excluded.
   */
  _fitTaskIntoBins(task, freeBins, deepWorkMaxMinutes, bufferMinutes, forceSplitTasks) {
    const needed = task.metadata?.estimated_minutes ?? 0;
    const splittable = forceSplitTasks ? true : (task.metadata?.splittable ?? false);
    const isCognitivelyHeavy = task.metadata?.cognitive_load === 'High';
    const isFixedTime = task.metadata?.fixed_time === true;

    // Parse chronological constraints from the AI's output.
    let startAfter, deadline;

    if (isFixedTime) {
      const rawStart = task.metadata?.start_after;
      startAfter = rawStart ? new Date(rawStart) : null;
      deadline = task.metadata?.deadline ? new Date(task.metadata.deadline) : null;
      
      // Fixed time tasks bypass bin packing and get pinned to their exact time.
      // We check if the parsed date is valid and contains more than just a date (YYYY-MM-DD).
      // A full ISO string for a fixed time should be > 10 chars.
      if (startAfter && !isNaN(startAfter.getTime()) && rawStart.length > 10) {
        const blockStart = startAfter;
        const blockEnd = deadline ? deadline : addMinutes(blockStart, needed);
        return { blocks: [{
          start_time: formatISO(blockStart),
          end_time: formatISO(blockEnd),
          calendar_event_id: null,
        }] };
      }
    } else {
      startAfter = task.metadata?.start_after
        ? this._toStartOfDay(task.metadata.start_after)
        : null;
      deadline = task.metadata?.deadline
        ? this._toEndOfDay(task.metadata.deadline)
        : null;
    }

    // For High cognitive load, cap each block at deep_work_max_minutes.
    const maxBlockSize = isCognitivelyHeavy ? deepWorkMaxMinutes : Infinity;

    const blocks = [];
    let remainingMinutes = needed;

    for (const bin of freeBins) {
      if (remainingMinutes <= 0) break;

      // Skip bins with no remaining capacity.
      if (bin.remainingMinutes <= bufferMinutes) continue;

      // ── CHRONOLOGICAL CONSTRAINT: start_after ──
      // If the task cannot start before a certain date, skip bins that end
      // before that date (they're too early).
      if (startAfter && bin.end <= startAfter) {
        continue;
      }

      // ── CHRONOLOGICAL CONSTRAINT: deadline ──
      // If the task must be completed by a certain date, skip bins that start
      // after that date (they're too late).
      if (deadline && bin.start >= deadline) {
        continue;
      }

      // Determine the effective start of this bin, respecting start_after.
      // If start_after falls mid-bin, we can only use the portion after it.
      let effectiveBinStart = new Date(bin.end.getTime() - bin.remainingMinutes * 60000);
      if (startAfter && effectiveBinStart < startAfter) {
        effectiveBinStart = new Date(Math.max(effectiveBinStart.getTime(), startAfter.getTime()));
      }

      // Determine the effective end of this bin, respecting deadline.
      let effectiveBinEnd = bin.end;
      if (deadline && effectiveBinEnd > deadline) {
        effectiveBinEnd = new Date(Math.min(effectiveBinEnd.getTime(), deadline.getTime()));
      }

      const effectiveMinutes = (effectiveBinEnd - effectiveBinStart) / 60000;
      if (effectiveMinutes <= bufferMinutes) continue;

      const canFitInBin = Math.min(effectiveMinutes, maxBlockSize, remainingMinutes);

      if (!splittable && canFitInBin < remainingMinutes) {
        // Non-splittable: this bin is too small, keep looking.
        continue;
      }

      // Carve out the block from the effective start of this bin.
      const blockStart = effectiveBinStart;
      const blockEnd = addMinutes(blockStart, canFitInBin);

      blocks.push({
        start_time: formatISO(blockStart),
        end_time: formatISO(blockEnd),
        calendar_event_id: null, // Will be filled by the Google Calendar adapter.
      });

      // Reduce the bin's remaining capacity by the full amount consumed.
      const consumedFromBin = (blockEnd - new Date(bin.end.getTime() - bin.remainingMinutes * 60000)) / 60000;
      bin.remainingMinutes -= Math.max(consumedFromBin, canFitInBin);
      remainingMinutes -= canFitInBin;

      if (!splittable) break; // Non-splittable: one block is enough once found.
    }

    // If we couldn't schedule all of it, don't return a partial result for non-splittable.
    if (!splittable && remainingMinutes > 0) {
      return { blocks: [] };
    }

    return { blocks };
  }

  // ---------------------------------------------------------------------------
  // Date Utility Helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts an ISO date string to the start of that day (00:00:00).
   * This ensures start_after comparisons include the entire target day.
   * @param {string} isoDate - e.g. "2026-05-11"
   * @returns {Date}
   */
  _toStartOfDay(isoDate) {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    return startOfDay(d);
  }

  /**
   * Converts an ISO date string to the end of that day (23:59:59.999).
   * This ensures deadline comparisons include the entire target day.
   * @param {string} isoDate - e.g. "2026-05-09"
   * @returns {Date}
   */
  _toEndOfDay(isoDate) {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    const end = startOfDay(d);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}

export default NUserBinPacking;
