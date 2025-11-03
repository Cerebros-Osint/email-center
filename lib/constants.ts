/**
 * Constantes centralisées pour toute l'application
 * Évite les magic numbers et facilite la maintenance
 */

// Rate Limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_SECONDS: 900, // 15 minutes
  LOGIN_BLOCK_DURATION_SECONDS: 3600, // 1 heure
  API_REQUESTS_PER_MINUTE: 60,
  SMTP_RETRY_ATTEMPTS: 3,
  SMTP_RETRY_BASE_DELAY_MS: 1000,
  MESSAGE_SEND_PER_MINUTE: 10,
} as const;

// Cache TTL (Time To Live)
export const CACHE_TTL = {
  MX_RECORDS_SECONDS: 48 * 60 * 60, // 48 heures
  IDENTITY_SECONDS: 10 * 60, // 10 minutes
  SETTINGS_SECONDS: 5 * 60, // 5 minutes
  SUCCESS_RATE_SECONDS: 10 * 60, // 10 minutes
  SMTP_CAPABILITIES_SECONDS: 60 * 60, // 1 heure
} as const;

// Scoring Weights (total = 100)
export const SCORING_WEIGHTS = {
  SUCCESS_RATE: 60,
  UPTIME: 10,
  RECENT_BOUNCES_PENALTY: 10,
  RATE_LIMIT: 15,
  CAPABILITIES: 5,
} as const;

// SMTP Configuration
export const SMTP_CONFIG = {
  CONNECTION_TIMEOUT_MS: 30000, // 30 secondes
  POOL_MAX_CONNECTIONS: 5,
  POOL_MAX_MESSAGES: 100,
  TRANSPORTER_POOL_MAX_SIZE: 50,
  TRANSPORTER_TTL_MS: 60 * 60 * 1000, // 1 heure
  DEFAULT_PORT: 587,
  SECURE_PORT: 465,
} as const;

// Message Limits
export const MESSAGE_LIMITS = {
  SUBJECT_MAX_LENGTH: 998, // RFC 5322
  BODY_MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  RECIPIENTS_MAX_PER_MESSAGE: 1000,
  ATTACHMENTS_MAX_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
} as const;

// Tracking
export const TRACKING_CONFIG = {
  TOKEN_LENGTH_BYTES: 32,
  DEDUPLICATION_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  PIXEL_SIZE: 1,
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  BACKOFF_MULTIPLIER: 1.7,
  BACKOFF_JITTER_PERCENT: 20,
  MAX_DELAY_MS: 60000, // 1 minute
} as const;

// Database
export const DB_CONFIG = {
  CONNECTION_POOL_SIZE: 20,
  QUERY_TIMEOUT_MS: 10000, // 10 secondes
  BATCH_SIZE: 100,
} as const;

// Session
export const SESSION_CONFIG = {
  TTL_SECONDS: 7 * 24 * 60 * 60, // 7 jours
  COOKIE_NAME: 'session',
  SECRET_MIN_LENGTH: 32,
} as const;

// Validation
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
} as const;

// Security
export const SECURITY = {
  ARGON2_MEMORY_KB: 65536, // 64 MB
  ARGON2_ITERATIONS: 3,
  ARGON2_PARALLELISM: 1,
  TOKEN_LENGTH_BYTES: 32,
  ENCRYPTION_KEY_LENGTH: 64, // hex string = 32 bytes
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

// SMTP Response Codes
export const SMTP_CODES = {
  SUCCESS_MIN: 200,
  SUCCESS_MAX: 299,
  TEMP_FAIL_MIN: 400,
  TEMP_FAIL_MAX: 499,
  PERM_FAIL_MIN: 500,
  PERM_FAIL_MAX: 599,
} as const;
