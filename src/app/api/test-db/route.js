import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Workspace from '@/models/Workspace';
import Task from '@/models/Task';

export async function GET() {
  const results = {
    connection: false,
    validations: [],
    cleanup: false
  };

  try {
    await dbConnect();
    results.connection = true;

    // 1. Test User Validation (Required Fields)
    try {
      await User.create({ name: 'Missing Email' });
      results.validations.push({ name: 'User Required Fields', status: 'FAIL', error: 'Created user without email' });
    } catch (e) {
      results.validations.push({ name: 'User Required Fields', status: 'PASS' });
    }

    // 2. Test User Enum Validation
    try {
      await User.create({ 
        name: 'Invalid Enum', 
        email: `invalid_${Date.now()}@test.com`, 
        auth_provider_id: '123',
        preferences: { preferred_window: 'Midnight' } // Not in enum
      });
      results.validations.push({ name: 'User Enum Validation', status: 'FAIL', error: 'Created user with invalid enum' });
    } catch (e) {
      results.validations.push({ name: 'User Enum Validation', status: 'PASS' });
    }

    // 3. Test Task Priority Validation
    try {
      await Task.create({ 
        workspace_id: new mongoose.Types.ObjectId(),
        assigned_to: new mongoose.Types.ObjectId(),
        metadata: {
          task_name: 'Invalid Priority',
          estimated_minutes: 30,
          cognitive_load: 'Low',
          priority: 'P9' // Not in enum
        }
      });
      results.validations.push({ name: 'Task Priority Validation', status: 'FAIL', error: 'Created task with invalid priority' });
    } catch (e) {
      results.validations.push({ name: 'Task Priority Validation', status: 'PASS' });
    }

    // 4. Successful Integration Test (User -> Workspace -> Task)
    const testEmail = `tester_${Date.now()}@syncforge.test`;
    const user = await User.create({
      name: 'Integration Tester',
      email: testEmail,
      auth_provider_id: 'test_id_' + Date.now(),
      preferences: { 
        preferred_window: 'Morning',
        work_day_start: '08:00',
        timezone: 'Asia/Manila'
      }
    });

    const workspace = await Workspace.create({
      workspace_name: 'Integration Workspace',
      members: [{ user_id: user._id, role: 'Owner' }]
    });

    const task = await Task.create({
      workspace_id: workspace._id,
      assigned_to: user._id,
      metadata: {
        task_name: 'Verify Integration with New Fields',
        estimated_minutes: 30,
        cognitive_load: 'Low',
        priority: 'P1',
        due_date: new Date(Date.now() + 86400000), // Tomorrow
        tags: ['critical', 'test']
      }
    });

    results.validations.push({ name: 'Relational Integrity & New Fields', status: 'PASS' });

    // Cleanup
    await Task.findByIdAndDelete(task._id);
    await Workspace.findByIdAndDelete(workspace._id);
    await User.findByIdAndDelete(user._id);
    results.cleanup = true;

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
  }
}
