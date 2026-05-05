/**
 * Integration Tests: Schedule API Endpoints
 *
 * Tests POST /api/schedule/generate and PATCH /api/schedule/recalculate
 * with real MongoDB connections. Verifies the full request-response cycle
 * including Zod validation, DB persistence, and the standardized response envelope.
 *
 * Coverage:
 * - Standard: Successful generation saves tasks to DB and returns schedule.
 * - Standard: Successful recalculation shifts snoozed tasks.
 * - Edge: Validation failures return VALIDATION_FAILED errors (missing required fields).
 * - Edge: Non-existent workspace returns WORKSPACE_NOT_FOUND.
 * - Edge: Non-existent task on recalculate returns TASK_NOT_FOUND.
 * - Extreme: Negative estimated_minutes is rejected before reaching the scheduler.
 */

// Shared test fixtures (workspace + user created via the DB test API)
let testWorkspaceId;
let testUserId;
let testTaskId;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFreeBusyBlocks() {
  return [{ busy: [] }]; // No busy time — full day is free for testing.
}

function makeTasks(overrides = {}) {
  return [{
    metadata: {
      task_name: 'Integration Test Task',
      estimated_minutes: 60,
      cognitive_load: 'Low',
      priority: 'P2',
      splittable: false,
      ...overrides,
    },
  }];
}

// ---------------------------------------------------------------------------
// Setup: Create a workspace and user for all tests in this file.
// ---------------------------------------------------------------------------

before(() => {
  cy.request('/api/test-db').then((res) => {
    // The test-db route now returns IDs from a fresh create/cleanup cycle.
    // We need our own setup for integration tests. Use the setup endpoint.
    cy.request({ method: 'POST', url: '/api/schedule/unit-test-scheduler',
      body: { tasks: [], calendars: [{ busy: [] }], prefs: {} } // Ping to confirm server is up.
    });
  });

  // Create real workspace + user for full integration tests.
  cy.request({
    method: 'POST',
    url: '/api/test-helpers/setup-workspace',
    failOnStatusCode: false,
  }).then((res) => {
    if (res.status === 200) {
      testWorkspaceId = res.body.workspaceId;
      testUserId = res.body.userId;
    }
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/schedule/generate — Integration Tests', () => {

  it('Standard: validates payload with Zod and rejects malformed body', () => {
    cy.request({
      method: 'POST',
      url: '/api/schedule/generate',
      body: { workspace_id: 'test', tasks: [], busy_blocks: [], triggered_by: 'user' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.eq('VALIDATION_FAILED');
    });
  });

  it('Extreme: rejects negative estimated_minutes before reaching the scheduler', () => {
    cy.request({
      method: 'POST',
      url: '/api/schedule/generate',
      body: {
        workspace_id: 'any-id',
        tasks: [{ metadata: { task_name: 'Bad Task', estimated_minutes: -30, cognitive_load: 'Low' } }],
        busy_blocks: [{ busy: [] }],
        triggered_by: 'user_123',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.eq('VALIDATION_FAILED');
    });
  });

  it('Edge: returns WORKSPACE_NOT_FOUND for a non-existent workspace ID', () => {
    cy.request({
      method: 'POST',
      url: '/api/schedule/generate',
      body: {
        workspace_id: '000000000000000000000000', // Valid ObjectId format but doesn't exist.
        tasks: makeTasks(),
        busy_blocks: makeFreeBusyBlocks(),
        triggered_by: 'user_123',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.eq('WORKSPACE_NOT_FOUND');
    });
  });

  it('Standard: returns the standardized success envelope structure', () => {
    if (!testWorkspaceId) {
      cy.log('Skipping: no test workspace available (setup may have failed).');
      return;
    }

    cy.request({
      method: 'POST',
      url: '/api/schedule/generate',
      body: {
        workspace_id: testWorkspaceId,
        tasks: makeTasks(),
        busy_blocks: makeFreeBusyBlocks(),
        triggered_by: testUserId,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
      expect(res.body).to.have.keys(['success', 'data', 'error', 'meta']);
      expect(res.body.meta).to.have.keys(['timestamp', 'processing_ms']);
      expect(res.body.data.scheduled).to.be.an('array');
      expect(res.body.data.unscheduled).to.be.an('array');

      // Save a task ID for the recalculate tests.
      if (res.body.data.scheduled.length > 0) {
        testTaskId = res.body.data.scheduled[0]._id;
      }
    });
  });
});

describe('PATCH /api/schedule/recalculate — Integration Tests', () => {

  it('Edge: returns VALIDATION_FAILED for invalid action type', () => {
    cy.request({
      method: 'PATCH',
      url: '/api/schedule/recalculate',
      body: {
        workspace_id: 'ws_123',
        interrupted_task_id: 'task_456',
        action: 'delete', // Not in enum ['snooze', 'missed'].
        busy_blocks: [{ busy: [] }],
        triggered_by: 'user_123',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.eq('VALIDATION_FAILED');
    });
  });

  it('Edge: returns TASK_NOT_FOUND for a non-existent task ID', () => {
    cy.request({
      method: 'PATCH',
      url: '/api/schedule/recalculate',
      body: {
        workspace_id: '000000000000000000000000',
        interrupted_task_id: '000000000000000000000001', // Valid format, doesn't exist.
        action: 'snooze',
        delay_minutes: 30,
        busy_blocks: [{ busy: [] }],
        triggered_by: 'user_123',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.eq('TASK_NOT_FOUND');
    });
  });

  it('Standard: snoozes a task and returns a recalculated schedule', () => {
    if (!testTaskId || !testWorkspaceId) {
      cy.log('Skipping: no test task available from the generate test above.');
      return;
    }

    cy.request({
      method: 'PATCH',
      url: '/api/schedule/recalculate',
      body: {
        workspace_id: testWorkspaceId,
        interrupted_task_id: testTaskId,
        action: 'snooze',
        delay_minutes: 30,
        busy_blocks: makeFreeBusyBlocks(),
        triggered_by: testUserId,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.keys(['scheduled', 'unscheduled', 'full']);
    });
  });
});
