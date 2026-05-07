import { NextResponse } from 'next/server';
import { z } from 'zod';
import NUserBinPacking from '@/services/scheduler/NUserBinPacking';

/**
 * POST /api/schedule/unit-test-scheduler
 *
 * A test-only endpoint that invokes NUserBinPacking directly, with zero DB or network calls.
 * This is the entry point for Cypress unit tests of the scheduler engine.
 *
 * It accepts tasks, calendars, and prefs directly — no workspace or user lookup.
 * Should not be called in production flows.
 */

const UnitTestSchema = z.object({
  tasks: z.array(z.object({
    _id: z.string().optional(),
    metadata: z.object({
      task_name: z.string(),
      estimated_minutes: z.number().positive(),
      cognitive_load: z.enum(['Low', 'Medium', 'High']),
      priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
      due_date: z.string().optional(),
      splittable: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    }),
  })),
  calendars: z.array(z.object({
    busy: z.array(z.object({ start: z.string(), end: z.string() })),
  })),
  prefs: z.object({
    work_day_start: z.string().optional(),
    work_day_end: z.string().optional(),
    timezone: z.string().optional(),
    deep_work_max_minutes: z.number().optional(),
    buffer_minutes: z.number().optional(),
    lookAheadDays: z.number().optional(), // Allows tests to constrain the search window
  }).optional(),
});

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UnitTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { tasks, calendars, prefs = {} } = parsed.data;

  // lookAheadDays can be passed via prefs to constrain the search window in unit tests.
  const { lookAheadDays, ...schedulerPrefs } = prefs;
  const scheduler = new NUserBinPacking(lookAheadDays);
  const result = scheduler.schedule(tasks, calendars, schedulerPrefs);

  return NextResponse.json(result, { status: 200 });
}
