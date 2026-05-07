import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  // 1. Relational Links
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, //

  // 2. The "Brain" (AI Enriched Metadata)
  metadata: {
    task_name: { type: String, required: true },
    estimated_minutes: { type: Number, required: true },
    cognitive_load: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    preferred_window: { type: String },
    splittable: { type: Boolean, default: false },
    start_after: { type: String, default: null },
    deadline: { type: String, default: null },
    priority: { type: String, enum: ['P1', 'P2', 'P3', 'P4'], default: 'P3' },
    depends_on: { type: String, default: null },
    fixed_time: { type: Boolean, default: false },
    recurrence: {
      frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'] },
      interval: { type: Number },
      days_of_week: [{ type: String, enum: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] }]
    }
  },

  // 3. The "Hands" (Deterministic Scheduler Output)
  status: { type: String, enum: ['Pending', 'Scheduled', 'Completed', 'Snoozed'], default: 'Pending' },

  // An array because "splittable" tasks might be broken into multiple blocks by the JS math
  schedule_blocks: [{
    start_time: { type: Date },
    end_time: { type: Date },
    calendar_event_id: { type: String } // Third-party reference ID for easy syncing
  }]
}, { timestamps: true, collection: 'Tasks' });

// Indexing to quickly load a team's schedule timeline
TaskSchema.index({ workspace_id: 1, status: 1 });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
