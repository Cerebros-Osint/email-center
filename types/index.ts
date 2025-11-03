// Types complets pour toute l'application - 0 any, 0 mock

export interface Message {
  id: string;
  orgId: string;
  identityId: string;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  sendStatus: 'draft' | 'queued' | 'sent' | 'failed' | 'paused';
  replyToToken: string | null;
  customDisplayName: string | null;
  customFromEmail: string | null;
  trackingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  identity?: Identity;
  recipients?: Recipient[];
}

export interface Recipient {
  id: string;
  messageId: string;
  toEmail: string;
  sendStatus: 'pending' | 'sent' | 'failed' | 'suppressed';
  mxDomain: string | null;
  mxRecordsJson: string | null;
  lastMxCheckedAt: string | null;
  routeSmtpAccountId: string | null;
  sentAt: string | null;
  trackingId: string | null;
  createdAt: string;
  updatedAt: string;
  message?: Message;
  sendAttempts?: SendAttempt[];
  trackingEvents?: TrackingEvent[];
}

export interface SendAttempt {
  id: string;
  recipientId: string;
  smtpAccountId: string;
  providerMsgId: string | null;
  result: 'ok' | 'fail';
  responseRaw: string | null;
  latencyMs: number;
  createdAt: string;
}

export interface Identity {
  id: string;
  orgId: string;
  displayName: string;
  fromEmail: string;
  defaultSmtpAccountId: string;
  createdAt: string;
  updatedAt: string;
  defaultSmtpAccount?: SmtpAccount;
}

export interface SmtpAccount {
  id: string;
  orgId: string;
  provider: string;
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  rateLimitPerMin: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  capabilities?: ProviderCapabilities;
}

export interface ProviderCapabilities {
  id: string;
  smtpAccountId: string;
  starttls: boolean;
  size: number | null;
  pipelining: boolean;
  eightBitMime: boolean;
  latencyMs: number | null;
  lastTestAt: string;
}

export interface OrgSettings {
  id: string;
  orgId: string;
  killSwitch: boolean;
  rateLimitPerMin: number | null;
  rateLimitPerDay: number | null;
  retentionDaysRawSource: number | null;
  listUnsubscribeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  id: string;
  recipientId: string;
  eventType: 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  userAgent: string | null;
  ipAddress: string | null;
  location: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface InboundMessage {
  id: string;
  orgId: string;
  replyToToken: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  rawSource: string | null;
  threadId: string | null;
  receivedAt: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'failed';
  recipientEmail: string;
  messageSubject: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

// Error handling types
export interface AppError {
  message: string;
  code?: string;
  stack?: string;
  details?: Record<string, unknown>;
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      stack: error.stack,
    };
  }
  
  return {
    message: String(error),
    code: 'UNKNOWN_ERROR',
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Job data types
export interface SendJobData {
  recipientId: string;
  messageId: string;
  orgId: string;
}

export interface PreflightJobData {
  messageId: string;
  orgId: string;
}

export interface DmarcAdjustJobData {
  domainConfigId: string;
  orgId: string;
}

export interface DkimRotateJobData {
  domainConfigId: string;
  orgId: string;
}

export interface DnsCheckJobData {
  domainConfigId: string;
  orgId: string;
}

export interface ImapPollJobData {
  orgId: string;
}

export interface DmarcMonitorJobData {
  orgId: string;
  domain: string;
  reportXml: string;
}
