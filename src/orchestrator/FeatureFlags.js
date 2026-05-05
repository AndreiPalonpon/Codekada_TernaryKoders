/**
 * FeatureFlags
 *
 * Central configuration for enabling or disabling features at runtime.
 * Controlled via environment variables so no code changes are needed to flip them.
 *
 * To enable real-time collaboration, set ENABLE_COLLAB=true in .env.local.
 */
export const FLAGS = {
  MULTI_USER_ENABLED: process.env.ENABLE_COLLAB === 'true' || false,
};
