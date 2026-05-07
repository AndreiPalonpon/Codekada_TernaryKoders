import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Workspace from '@/models/Workspace';

/**
 * POST /api/test-helpers/setup-workspace
 *
 * Test-only endpoint. Creates a fresh User + Workspace for integration testing.
 * Returns the IDs so Cypress integration tests can pass real IDs to the schedule APIs.
 *
 * Records are prefixed with a timestamp to avoid collisions between test runs.
 * Cleanup happens automatically in the next test-db run.
 */
export async function POST() {
  try {
    await dbConnect();

    const tag = Date.now();

    const user = await User.create({
      name: 'Integration Test User',
      email: `integration_${tag}@syncforge.test`,
      auth_provider_id: `test_provider_${tag}`,
      preferences: {
        preferred_window: 'Morning',
        work_day_start: '09:00',
        work_day_end: '17:00',
        timezone: 'UTC',
        deep_work_max_minutes: 240,
        buffer_minutes: 15,
      },
    });

    const workspace = await Workspace.create({
      workspace_name: `Integration Workspace ${tag}`,
      members: [{ user_id: user._id, role: 'Owner' }],
    });

    return NextResponse.json({ workspaceId: workspace._id, userId: user._id }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
