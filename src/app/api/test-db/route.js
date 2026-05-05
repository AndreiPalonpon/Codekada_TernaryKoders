import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Workspace from '@/models/Workspace';
import Task from '@/models/Task';

export async function GET() {
  try {
    await dbConnect();

    // 1. Test UserProfile Creation
    const testEmail = `test_${Date.now()}@example.com`;
    const user = await User.create({
      name: 'Test User',
      email: testEmail,
      auth_provider_id: 'google_12345',
      preferences: {
        preferred_window: 'Morning',
        deep_work_max_minutes: 120,
        buffer_minutes: 15
      }
    });

    // 2. Test Workspace Creation
    const workspace = await Workspace.create({
      workspace_name: 'Test Workspace',
      description: 'A workspace for testing',
      members: [{
        user_id: user._id,
        role: 'Owner'
      }]
    });

    // 3. Test Task Creation
    const task = await Task.create({
      workspace_id: workspace._id,
      assigned_to: user._id,
      metadata: {
        task_name: 'Test Setup Database',
        estimated_minutes: 60,
        cognitive_load: 'High',
        preferred_window: 'Morning',
        splittable: false
      },
      status: 'Pending'
    });

    // Cleanup: Delete the created test documents to keep the DB clean
    await Task.findByIdAndDelete(task._id);
    await Workspace.findByIdAndDelete(workspace._id);
    await User.findByIdAndDelete(user._id);

    return NextResponse.json({ success: true, message: 'Database connection and schema validation successful' });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
