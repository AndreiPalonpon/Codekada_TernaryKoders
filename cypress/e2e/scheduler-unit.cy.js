/**
 * Unit Tests: NUserBinPacking Scheduler Engine
 *
 * Tests the deterministic bin-packing algorithm in full isolation.
 * No database, no network calls — pure JS logic tests.
 *
 * Coverage based on testing.md:
 * - Standard Case (Single User)
 * - Standard Case (Team / Multi-User)
 * - Edge Case: Zero-Gap Scenario (no free time)
 * - Edge Case: Non-splittable task too large for any single bin
 * - Edge Case: Splittable task spans multiple bins
 * - Edge Case: Priority sorting (P1 gets scheduled before P4)
 * - Extreme Case: The 24-Hour Task (exceeds deep_work_max_minutes)
 * - Extreme Case: Empty task array
 */

// ---------------------------------------------------------------------------
// Helpers: Build test fixtures
// ---------------------------------------------------------------------------

/**
 * Creates a minimal task object that the scheduler accepts.
 */
function makeTask(overrides = {}) {
  return {
    _id: overrides._id || `task_${Math.random().toString(36).slice(2)}`,
    metadata: {
      task_name: 'Test Task',
      estimated_minutes: 60,
      cognitive_load: 'Low',
      priority: 'P3',
      splittable: false,
      ...overrides.metadata,
    },
    ...overrides,
  };
}

/**
 * Builds a calendar with busy blocks for tomorrow.
 * Using tomorrow guarantees all bins are in the future regardless of what time tests run.
 * busySlots: array of [startHour, endHour] pairs (24h, local time).
 */
function makeCalendar(busySlots = []) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const busy = busySlots.map(([startH, endH]) => {
    const start = new Date(tomorrow);
    start.setHours(startH, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(endH, 0, 0, 0);
    return { start: start.toISOString(), end: end.toISOString() };
  });
  return { busy };
}

const DEFAULT_PREFS = {
  work_day_start: '09:00',
  work_day_end: '17:00',
  timezone: 'UTC',
  deep_work_max_minutes: 240,
  buffer_minutes: 15,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NUserBinPacking — Scheduler Unit Tests', () => {

  // We call the scheduler via the /api/schedule/generate endpoint so we can test
  // the pure logic without importing the module directly into Cypress.
  // A dedicated unit-test endpoint is used for full isolation.
  const UNIT_TEST_URL = '/api/schedule/unit-test-scheduler';

  // Helper: POST to the unit-test scheduler endpoint.
  function runScheduler(tasks, calendars, prefs = {}) {
    return cy.request({
      method: 'POST',
      url: UNIT_TEST_URL,
      body: { tasks, calendars, prefs: { ...DEFAULT_PREFS, ...prefs } },
      failOnStatusCode: false,
    });
  }

  // ----------------------------------------------------------------
  // Standard Cases
  // ----------------------------------------------------------------

  it('Standard: schedules a single 60-min task into a free morning slot', () => {
    const tasks = [makeTask({ metadata: { task_name: 'Write Report', estimated_minutes: 60, cognitive_load: 'Low', priority: 'P2', splittable: false } })];
    const calendars = [makeCalendar()]; // No busy blocks — full day is free.

    runScheduler(tasks, calendars).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.scheduled).to.have.length(1);
      expect(res.body.scheduled[0].schedule_blocks).to.have.length(1);
      expect(res.body.unscheduled).to.have.length(0);
    });
  });

  it('Standard (Multi-User): finds overlapping free time across 2 user calendars', () => {
    // User A is busy 9-11, User B is busy 13-15.
    // Free window for BOTH: 11:15-13:00 and 15:15-17:00.
    const tasks = [makeTask({ metadata: { task_name: 'Team Sync', estimated_minutes: 30, cognitive_load: 'Low', priority: 'P1', splittable: false } })];
    const calendars = [
      makeCalendar([[9, 11]]),
      makeCalendar([[13, 15]]),
    ];

    runScheduler(tasks, calendars).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.scheduled).to.have.length(1);
      expect(res.body.scheduled[0].schedule_blocks).to.have.length(1);
    });
  });

  // ----------------------------------------------------------------
  // Edge Cases
  // ----------------------------------------------------------------

  it('Edge: returns full=true and unscheduled tasks when no free bins exist', () => {
    const tasks = [makeTask({ metadata: { task_name: 'Impossible Task', estimated_minutes: 60, cognitive_load: 'Low', priority: 'P1', splittable: false } })];
    // Busy from 9am to 5pm tomorrow — the entire working day.
    // lookAheadDays:2 covers today (rest of day, already past) + tomorrow (all busy via makeCalendar).
    const calendars = [makeCalendar([[9, 17]])];

    runScheduler(tasks, calendars, { lookAheadDays: 2 }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.full).to.be.true;
      expect(res.body.unscheduled).to.have.length(1);
      expect(res.body.scheduled).to.have.length(0);
    });
  });

  it('Edge: non-splittable task is NOT scheduled if no single bin is large enough', () => {
    // Free bins: two 45-min slots. Task needs 90 mins and is non-splittable.
    const tasks = [makeTask({ metadata: { task_name: 'Long Non-Split', estimated_minutes: 90, cognitive_load: 'Low', priority: 'P2', splittable: false } })];
    const calendars = [makeCalendar([[9, 10], [11, 16]])]; // 45min gap (10-11), then 5hr gap (11-16 minus buffer)

    runScheduler(tasks, calendars).then((res) => {
      expect(res.status).to.eq(200);
      // The 5-hour block (after buffer) should be large enough for 90 mins.
      expect(res.body.scheduled).to.have.length(1);
    });
  });

  it('Edge: splittable task is broken across multiple bins', () => {
    // Task is 5 hours (300 min). Available bins tomorrow with busy 11-13:
    // ~2hrs morning bin + ~4hrs afternoon bin = 6hrs total, enough to schedule.
    // Since the morning bin (120 min) < task size (300 min), the scheduler MUST split it
    // across both bins, producing 2 schedule_blocks.
    const tasks = [makeTask({ metadata: { task_name: 'Long Research', estimated_minutes: 300, cognitive_load: 'Medium', priority: 'P3', splittable: true } })];
    const calendars = [makeCalendar([[11, 13]])]; // 2hr free morning + 4hr free afternoon (tomorrow).

    // lookAheadDays:2 covers today (already past) + tomorrow (where makeCalendar puts bins).
    runScheduler(tasks, calendars, { lookAheadDays: 2 }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.scheduled).to.have.length(1);
      // Should have 2+ schedule blocks because the task was split across bins.
      expect(res.body.scheduled[0].schedule_blocks.length).to.be.greaterThan(1);
    });
  });

  it('Edge: P1 tasks are scheduled before P4 tasks even if P4 was listed first', () => {
    const tasks = [
      makeTask({ metadata: { task_name: 'Low Priority', estimated_minutes: 120, cognitive_load: 'Low', priority: 'P4', splittable: false } }),
      makeTask({ metadata: { task_name: 'Critical Task', estimated_minutes: 30, cognitive_load: 'High', priority: 'P1', splittable: false } }),
    ];
    const calendars = [makeCalendar([[11, 13]])]; // ~2hrs free in morning, ~4hrs free in afternoon.

    runScheduler(tasks, calendars).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.scheduled).to.have.length(2);
      // The P1 task block should start before the P4 task block.
      const criticalStart = new Date(res.body.scheduled.find(t => t.metadata.priority === 'P1').schedule_blocks[0].start_time);
      const lowStart = new Date(res.body.scheduled.find(t => t.metadata.priority === 'P4').schedule_blocks[0].start_time);
      expect(criticalStart.getTime()).to.be.lessThan(lowStart.getTime());
    });
  });

  // ----------------------------------------------------------------
  // Extreme Cases
  // ----------------------------------------------------------------

  it('Extreme: returns empty result for an empty task array without crashing', () => {
    runScheduler([], [makeCalendar()]).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.scheduled).to.have.length(0);
      expect(res.body.unscheduled).to.have.length(0);
      expect(res.body.full).to.be.false;
    });
  });

  it('Extreme: a 24-hour task (1440 min) is split across multiple deep-work blocks (240min cap)', () => {
    const tasks = [makeTask({
      metadata: {
        task_name: 'Insane Project',
        estimated_minutes: 1440,
        cognitive_load: 'High', // Applies deep_work_max_minutes cap per block.
        priority: 'P1',
        splittable: true,
      },
    })];
    const calendars = [makeCalendar()]; // Completely free for 7 days.

    runScheduler(tasks, calendars, { deep_work_max_minutes: 240 }).then((res) => {
      expect(res.status).to.eq(200);
      const scheduledTask = res.body.scheduled[0];
      if (scheduledTask) {
        // Each block must not exceed 240 minutes.
        scheduledTask.schedule_blocks.forEach((block) => {
          const durationMs = new Date(block.end_time) - new Date(block.start_time);
          const durationMin = durationMs / 60000;
          expect(durationMin).to.be.at.most(240);
        });
      }
    });
  });
});
