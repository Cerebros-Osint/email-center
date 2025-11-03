import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

// SMTP Account schemas
export const smtpAccountSchema = z.object({
  provider: z.string().min(1, 'Fournisseur requis'),
  host: z.string().min(1, 'Hôte requis'),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1, 'Nom d\'utilisateur requis'),
  password: z.string().min(1, 'Mot de passe requis'),
  fromEmail: z.string().email('Email invalide'),
  rateLimitPerMin: z.number().int().positive().optional(),
});

export const smtpAccountUpdateSchema = smtpAccountSchema.partial();

// Identity schemas
export const identitySchema = z.object({
  displayName: z.string().min(1, 'Nom d\'affichage requis'),
  fromEmail: z.string().email('Email invalide'),
  defaultSmtpAccountId: z.string().uuid(),
});

export const identityUpdateSchema = identitySchema.partial();

// Message schemas
export const messageSchema = z.object({
  identityId: z.string().uuid('Identity ID invalide'),
  subject: z.string().min(1, 'Sujet requis'),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  recipients: z.array(z.string().email()).min(1, 'Au moins un destinataire requis'),
  customDisplayName: z.string().optional(),
  customFromEmail: z.string().email('Email invalide').optional(),
  trackingEnabled: z.boolean().optional().default(true),
});

export const preflightSchema = z.object({
  identityId: z.string().uuid(),
  recipients: z.array(z.string().email()).min(1),
  subject: z.string(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
});

// Settings schemas
export const orgSettingsSchema = z.object({
  killSwitch: z.boolean().optional(),
  rateLimitPerMin: z.number().int().positive().optional(),
  rateLimitPerDay: z.number().int().positive().optional(),
  retentionDaysRawSource: z.number().int().min(0).optional(),
  listUnsubscribeEnabled: z.boolean().optional(),
});

// DNS schemas
export const dnsCheckSchema = z.object({
  domain: z.string().min(1, 'Domaine requis'),
});

export const dkimRotateSchema = z.object({
  domainConfigId: z.string().uuid(),
});

export const dmarcPublishSchema = z.object({
  domainConfigId: z.string().uuid(),
  policy: z.enum(['none', 'quarantine', 'reject']),
  pct: z.number().int().min(0).max(100),
  aspf: z.enum(['r', 's']).optional(),
  adkim: z.enum(['r', 's']).optional(),
});

// Suppression schemas
export const suppressionSchema = z.object({
  email: z.string().email('Email invalide'),
  reason: z.string().min(1, 'Raison requise'),
});

// Query schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const historyQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'queued', 'sent', 'failed', 'paused']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const inboxQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  unreadOnly: z.boolean().optional(),
});

/**
 * Validate email address format (RFC 5322 simplified)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email is a role account (should be flagged in preflight)
 */
export function isRoleEmail(email: string): boolean {
  const roleAccounts = [
    'abuse', 'admin', 'billing', 'compliance', 'devnull', 'dns',
    'ftp', 'hostmaster', 'inoc', 'ispfeedback', 'ispsupport',
    'list-request', 'list', 'maildaemon', 'noc', 'no-reply',
    'noreply', 'null', 'phish', 'phishing', 'postmaster',
    'privacy', 'registrar', 'root', 'security', 'spam',
    'support', 'sysadmin', 'tech', 'undisclosed-recipients',
    'info', 'unsubscribe', 'usenet', 'uucp', 'webmaster', 'www'
  ];

  if (!email || typeof email !== 'string') return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const localPart = parts[0].toLowerCase();
  return roleAccounts.includes(localPart);
}

/**
 * Extract domain from email
 */
export function extractDomain(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '';
  const local = parts[0].trim();
  const domain = parts[1].trim();
  if (!local || !domain) return '';
  return domain;
}

/**
 * Sanitize HTML (basic - will use sanitize-html in actual implementation)
 */
export function sanitizeHtml(html: string): string {
  // This is a placeholder - actual implementation in sanitize.ts
  return html;
}
