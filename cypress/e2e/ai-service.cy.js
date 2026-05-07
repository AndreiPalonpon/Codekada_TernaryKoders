/**
 * ai-service.cy.js
 *
 * Integration tests for the AI Service (POST /api/ai/generate).
 *
 * Testing philosophy (per user direction):
 * - We do NOT check the exact content of AI responses (non-deterministic LLM).
 * - We DO check:
 *   1. Schema conformance — every returned task must match the OpenAPI contract.
 *   2. Timing — the API must respond within a reasonable deadline (30 seconds).
 *   3. Input validation — malformed requests must be rejected with clear errors.
 *   4. Fallback behavior — missing/invalid prompts return a handled response.
 *
 * Test categories:
 * - Unit-style: Input validation (no real AI call, pure HTTP contract checks).
 * - Integration: Live Gemini API call checked for schema conformance and timing.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AI_GENERATE_URL = '/api/ai/generate';

// Realistic timeout: Gemini 2.5 Flash with low thinking should respond in < 30s.
// We set a generous limit to avoid flaky failures on slow CI runners.
const AI_RESPONSE_TIMEOUT_MS = 30_000;

// A minimal valid payload for all happy-path tests.
const VALID_PAYLOAD = {
  workspace_id:     '6641a2f3e4b0c3a1d2e5f001', // Fake but valid-length ObjectId
  assigned_to:      '6641a2f3e4b0c3a1d2e5f002',
  user_preferences: { preferred_window: 'Morning', deep_work_max_minutes: 120 },
  text_prompt:      'Study for the Operating Systems exam. Review memory management and process scheduling. Prepare flashcards.',
};

// ---------------------------------------------------------------------------
// Helper: validates a single task object against the OpenAPI schema contract.
// This is the single source of truth for schema assertions in all tests.
// ---------------------------------------------------------------------------
function assertTaskConformsToSchema(task) {
  // Top-level required fields
  expect(task).to.have.property('workspace_id').that.is.a('string');
  expect(task).to.have.property('assigned_to').that.is.a('string');
  expect(task).to.have.property('metadata').that.is.an('object');

  // Workspace and user IDs must echo the values we sent
  expect(task.workspace_id).to.equal(VALID_PAYLOAD.workspace_id);
  expect(task.assigned_to).to.equal(VALID_PAYLOAD.assigned_to);

  const { metadata } = task;

  // Required metadata fields
  expect(metadata).to.have.property('task_name').that.is.a('string').and.not.empty;
  expect(metadata).to.have.property('estimated_minutes').that.is.a('number');
  expect(metadata).to.have.property('cognitive_load').that.is.a('string');
  expect(metadata).to.have.property('preferred_window').that.is.a('string');
  expect(metadata).to.have.property('splittable').that.is.a('boolean');

  // Enum constraints
  expect(['Low', 'Medium', 'High']).to.include(metadata.cognitive_load);
  expect(['Morning', 'Afternoon', 'Night']).to.include(metadata.preferred_window);

  // Numeric constraints
  expect(metadata.estimated_minutes).to.be.greaterThan(0);
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AI Service — POST /api/ai/generate', () => {

  // =========================================================================
  // 1. INPUT VALIDATION (unit-style — no live AI call, instant responses)
  // =========================================================================

  describe('1. Input Validation', () => {

    it('rejects a request with no body (400)', () => {
      cy.request({
        method:   'POST',
        url:      AI_GENERATE_URL,
        body:     {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('VALIDATION_FAILED');
      });
    });

    it('rejects a request missing workspace_id (400)', () => {
      const badPayload = { ...VALID_PAYLOAD };
      delete badPayload.workspace_id;

      cy.request({
        method: 'POST',
        url:    AI_GENERATE_URL,
        body:   badPayload,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('VALIDATION_FAILED');
      });
    });

    it('rejects a request missing assigned_to (400)', () => {
      const badPayload = { ...VALID_PAYLOAD };
      delete badPayload.assigned_to;

      cy.request({
        method: 'POST',
        url:    AI_GENERATE_URL,
        body:   badPayload,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
      });
    });

    it('rejects an empty text_prompt (400)', () => {
      cy.request({
        method: 'POST',
        url:    AI_GENERATE_URL,
        body:   { ...VALID_PAYLOAD, text_prompt: '' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('VALIDATION_FAILED');
      });
    });

    it('rejects a non-JSON body (400)', () => {
      cy.request({
        method:  'POST',
        url:     AI_GENERATE_URL,
        body:    'this is not json',
        headers: { 'Content-Type': 'text/plain' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
      });
    });

  }); // end: Input Validation

  // =========================================================================
  // 2. HAPPY PATH — SCHEMA CONFORMANCE (live Gemini API)
  //    We check structure and timing, NOT exact content.
  // =========================================================================

  describe('2. Live AI — Schema Conformance & Timing', () => {

    it('returns a 200 with the standard API envelope', { timeout: AI_RESPONSE_TIMEOUT_MS + 5000 }, () => {
      const requestStart = Date.now();

      cy.request({
        method:  'POST',
        url:     AI_GENERATE_URL,
        body:    VALID_PAYLOAD,
        timeout: AI_RESPONSE_TIMEOUT_MS,
      }).then((response) => {
        const elapsedMs = Date.now() - requestStart;

        // Status
        expect(response.status).to.equal(200);

        // Envelope shape
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('data').that.is.an('object');
        expect(response.body).to.have.property('error', null);
        expect(response.body).to.have.property('meta').that.is.an('object');

        // Timing: API responded within the deadline
        expect(elapsedMs).to.be.lessThan(AI_RESPONSE_TIMEOUT_MS,
          `AI took ${elapsedMs}ms — exceeded the ${AI_RESPONSE_TIMEOUT_MS}ms deadline`
        );

        // Generation strategy should be reported
        expect(response.body.data).to.have.property('generation_strategy', 'standard');
      });
    });

    it('returns a 200 with the cached/large document generation strategy', { timeout: AI_RESPONSE_TIMEOUT_MS + 5000 }, () => {
      cy.request({
        method:  'POST',
        url:     AI_GENERATE_URL,
        body:    {
          ...VALID_PAYLOAD,
          file_uri: 'Syllabus Course Outline: CS 101. Final Exam on Dec 10, worth 40%. Homework 1 on Nov 5, worth 10%.',
          file_mime_type: 'text/plain',
          text_prompt: 'Extract all study tasks from this syllabus text.',
        },
        timeout: AI_RESPONSE_TIMEOUT_MS,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('generation_strategy', 'cache');
        expect(response.body.data.tasks).to.be.an('array');
      });
    });

    it('returns a tasks array in the response data', { timeout: AI_RESPONSE_TIMEOUT_MS + 5000 }, () => {
      cy.request({
        method:  'POST',
        url:     AI_GENERATE_URL,
        body:    VALID_PAYLOAD,
        timeout: AI_RESPONSE_TIMEOUT_MS,
      }).then((response) => {
        expect(response.body.data).to.have.property('tasks').that.is.an('array');
      });
    });

    it('returns tasks that all conform to the OpenAPI schema', { timeout: AI_RESPONSE_TIMEOUT_MS * 4 }, () => {
      // Use a very explicit, multi-task prompt to maximize the likelihood that
      // the model returns at least one task. We check schema conformance on
      // whatever the model returns — we do NOT dictate the exact tasks.
      const schemaTestPayload = {
        ...VALID_PAYLOAD,
        text_prompt: [
          'Task 1: Read Chapter 5 of the OS textbook on memory management. Estimated 45 minutes.',
          'Task 2: Write a 500-word summary of process scheduling algorithms. Estimated 60 minutes.',
          'Task 3: Create flashcards for all key terms in Chapter 5. Estimated 30 minutes.',
        ].join(' '),
      };

      // Helper function to send the request and retry up to 3 times on empty fallback results
      // caused by free-tier 429 rate limit cooling down.
      function sendRequestWithRetry(retriesLeft = 3) {
        return cy.request({
          method:  'POST',
          url:     AI_GENERATE_URL,
          body:    schemaTestPayload,
          timeout: AI_RESPONSE_TIMEOUT_MS,
        }).then((response) => {
          expect(response.status).to.equal(200);
          const { tasks } = response.body.data;

          if (tasks.length === 0 && retriesLeft > 0) {
            cy.log(`Empty tasks returned (likely due to free-tier 429 rate limit fallback). Retries left: ${retriesLeft}. Waiting 2.5s for cooldown...`);
            cy.wait(2500); // Cooldown delay
            return sendRequestWithRetry(retriesLeft - 1);
          }

          return cy.wrap(response);
        });
      }

      sendRequestWithRetry().then((response) => {
        const { tasks } = response.body.data;
        cy.log(`AI returned ${tasks.length} task(s)`);

        // The model must return at least 1 task for such an explicit multi-task prompt.
        expect(tasks.length, 'AI must return at least 1 task for explicit multi-task prompt').to.be.greaterThan(0);

        // Every task must conform to the full schema contract.
        tasks.forEach((task, index) => {
          cy.log(`Asserting schema on task[${index}]: "${task?.metadata?.task_name}"`);
          assertTaskConformsToSchema(task);
        });
      });
    });

    it('returns an array (possibly empty) for a vague prompt — no crash', { timeout: AI_RESPONSE_TIMEOUT_MS + 5000 }, () => {
      cy.request({
        method:  'POST',
        url:     AI_GENERATE_URL,
        body:    { ...VALID_PAYLOAD, text_prompt: 'just do stuff' },
        timeout: AI_RESPONSE_TIMEOUT_MS,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.data.tasks).to.be.an('array');
        // Whether the model returns tasks or [] is acceptable — we don't dictate content.
      });
    });

    it('meta block contains a valid timestamp and a non-negative processing_ms', { timeout: AI_RESPONSE_TIMEOUT_MS + 5000 }, () => {
      cy.request({
        method:  'POST',
        url:     AI_GENERATE_URL,
        body:    VALID_PAYLOAD,
        timeout: AI_RESPONSE_TIMEOUT_MS,
      }).then((response) => {
        const { meta } = response.body;
        expect(meta).to.have.property('timestamp').that.is.a('string');
        expect(meta).to.have.property('processing_ms').that.is.a('number');
        expect(meta.processing_ms).to.be.at.least(0);

        // Timestamp should be a parseable ISO string.
        expect(new Date(meta.timestamp).toString()).to.not.equal('Invalid Date');
      });
    });

  }); // end: Live AI — Schema Conformance & Timing

  // =========================================================================
  // 3. EDGE CASES
  // =========================================================================

  describe('3. Edge Cases', () => {

    it('handles a prompt that contains only numbers/gibberish gracefully', { timeout: AI_RESPONSE_TIMEOUT_MS + 5000 }, () => {
      cy.request({
        method:  'POST',
        url:     AI_GENERATE_URL,
        body:    { ...VALID_PAYLOAD, text_prompt: '12345 !!! @@@ ###' },
        timeout: AI_RESPONSE_TIMEOUT_MS,
        failOnStatusCode: false,
      }).then((response) => {
        // Should be 200 with an empty or minimal tasks array — not a 500.
        expect(response.status).to.equal(200);
        expect(response.body.data.tasks).to.be.an('array');
      });
    });

    it('returns an empty tasks array — not an error — when no tasks are identifiable', { timeout: AI_RESPONSE_TIMEOUT_MS + 5000 }, () => {
      cy.request({
        method:  'POST',
        url:     AI_GENERATE_URL,
        body:    { ...VALID_PAYLOAD, text_prompt: 'Hello! How are you today?' },
        timeout: AI_RESPONSE_TIMEOUT_MS,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data.tasks).to.be.an('array');
        // Could be [] or a minimal array — both are valid.
      });
    });

  }); // end: Edge Cases

}); // end: describe AI Service
