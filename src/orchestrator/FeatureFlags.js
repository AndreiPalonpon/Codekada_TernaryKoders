/**
 * AI Provider Enumeration
 * Defines all supported model providers in the SyncForge platform.
 */
export const AI_PROVIDERS = {
  GEMINI:   'GEMINI',
  GEMMA:    'GEMMA',
  QWEN:     'QWEN',     // Reserved for future integration
};

/**
 * FeatureFlags
 *
 * Central configuration for enabling or disabling features at runtime.
 * Controlled via environment variables so no code changes are needed to flip them.
 *
 * Available flags:
 *   ENABLE_COLLAB=true             → Activates Pusher real-time multi-user collaboration.
 *   ACTIVE_AI_PROVIDER="GEMINI"    → Sets active model provider (options: GEMINI, GEMMA).
 */
export const FLAGS = {
  MULTI_USER_ENABLED: process.env.ENABLE_COLLAB     === 'true' || false,
  ACTIVE_AI_PROVIDER: process.env.ACTIVE_AI_PROVIDER || AI_PROVIDERS.GEMINI,
};
