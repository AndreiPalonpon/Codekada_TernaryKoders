import mongoose from 'mongoose';

const UserProfileSchema = new mongoose.Schema({
  // 1. Identity & Auth
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  auth_provider_id: { type: String, required: true }, // e.g., Google sub ID
  
  // 2. AI Scheduling Preferences
  preferences: {
    preferred_window: { type: String, enum: ['Morning', 'Afternoon', 'Night'], default: 'Morning' },
    work_day_start: { type: String, default: '09:00' }, // 24h format
    work_day_end: { type: String, default: '17:00' },
    timezone: { type: String, default: 'UTC' },
    deep_work_max_minutes: { type: Number, default: 240 },
    buffer_minutes: { type: Number, default: 15 } // Gap between heavy tasks
  },

  // 3. Integration Tokens (Encrypted)
  integrations: {
    google_calendar: {
      access_token: { type: String },
      refresh_token: { type: String },
      token_expiry: { type: Date }
    }
  }
}, { timestamps: true, collection: 'Users' });

export default mongoose.models.User || mongoose.model('User', UserProfileSchema);
