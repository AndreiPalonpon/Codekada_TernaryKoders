import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema({
  // 1. Workspace Identity
  workspace_name: { type: String, required: true },
  description: { type: String },
  
  // 2. Relational Member Mapping (Normalized)
  members: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['Owner', 'Editor', 'Viewer'], default: 'Editor' },
    joined_at: { type: Date, default: Date.now }
  }],

  // 3. Analytical Telemetry
  // Storing aggregate counters here prevents expensive array counting queries on load.
  analytics: {
    total_tasks_created: { type: Number, default: 0 },
    total_deep_work_hours: { type: Number, default: 0 }
  }
}, { timestamps: true, collection: 'Workspaces' });

// Indexing for fast retrieval of workspaces a user belongs to
WorkspaceSchema.index({ "members.user_id": 1 });

export default mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);
