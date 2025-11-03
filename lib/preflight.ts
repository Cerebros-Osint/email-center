import { prisma } from './db';
import { getMx } from './dns';
import { scoreSmtpAccounts } from './routing';
import { isValidEmail, isRoleEmail, extractDomain } from './validator';
import { logger } from './logger';

export interface PreflightRecipient {
  email: string;
  valid: boolean;
  isRole: boolean;
  isSuppressed: boolean;
  mxRecords: Array<{ exchange: string; priority: number }> | null;
  mxHint: string | null;
  recommendedSmtp: {
    id: string;
    provider: string;
    score: number;
    explanation: string;
  } | null;
  warnings: string[];
  errors: string[];
}

export interface PreflightResult {
  recipients: PreflightRecipient[];
  estimatedSize: number;
  canSend: boolean;
  blockers: string[];
  warnings: string[];
}

/**
 * Perform preflight checks before sending
 */
export async function performPreflight(params: {
  orgId: string;
  recipients: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}): Promise<PreflightResult> {
  const { orgId, recipients, subject, bodyHtml, bodyText } = params;
  
  const result: PreflightResult = {
    recipients: [],
    estimatedSize: 0,
    canSend: true,
    blockers: [],
    warnings: [],
  };
  
  // Check org settings
  const orgSettings = await prisma.orgSettings.findUnique({
    where: { orgId },
  });
  
  if (orgSettings?.killSwitch) {
    result.canSend = false;
    result.blockers.push('Kill switch activé - envois bloqués');
    return result;
  }
  
  // Estimate message size
  result.estimatedSize = estimateMessageSize(subject, bodyHtml, bodyText);
  if (result.estimatedSize > 25 * 1024 * 1024) {
    result.blockers.push('Taille du message > 25MB');
    result.canSend = false;
  }
  
  // Check each recipient
  for (const email of recipients) {
    const recipientCheck: PreflightRecipient = {
      email,
      valid: isValidEmail(email),
      isRole: isRoleEmail(email),
      isSuppressed: false,
      mxRecords: null,
      mxHint: null,
      recommendedSmtp: null,
      warnings: [],
      errors: [],
    };
    
    if (!recipientCheck.valid) {
      recipientCheck.errors.push('Format email invalide');
      result.recipients.push(recipientCheck);
      continue;
    }
    
    if (recipientCheck.isRole) {
      recipientCheck.warnings.push('Compte de rôle détecté (abuse, postmaster, etc.)');
    }
    
    // Check suppression list
    const suppressed = await prisma.suppressedRecipient.findUnique({
      where: {
        orgId_email: {
          orgId,
          email: email.toLowerCase(),
        },
      },
    });
    
    if (suppressed) {
      recipientCheck.isSuppressed = true;
      recipientCheck.errors.push(`Supprimé: ${suppressed.reason}`);
      result.recipients.push(recipientCheck);
      continue;
    }
    
    // MX lookup
    const domain = extractDomain(email);
    try {
      const mxResult = await getMx(domain);
      recipientCheck.mxRecords = mxResult.records;
      recipientCheck.mxHint = mxResult.hint;
      
      // Get recommended SMTP
      const scores = await scoreSmtpAccounts({
        orgId,
        recipientEmail: email,
        mxHint: mxResult.hint,
      });
      
      if (scores.length > 0) {
        const best = scores[0];
        recipientCheck.recommendedSmtp = {
          id: best.smtpAccountId,
          provider: best.provider,
          score: best.score,
          explanation: generateScoreExplanation(best),
        };
      } else {
        recipientCheck.errors.push('Aucun compte SMTP disponible');
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      recipientCheck.errors.push(`Échec lookup MX: ${errMsg}`);
      logger.warn({ email, error: errMsg }, 'MX lookup failed in preflight');
    }
    
    result.recipients.push(recipientCheck);
  }
  
  // Aggregate blockers
  const hasErrors = result.recipients.some((r) => r.errors.length > 0);
  if (hasErrors) {
    result.canSend = false;
    result.blockers.push('Certains destinataires ont des erreurs');
  }
  
  return result;
}

/**
 * Estimate message size in bytes
 */
function estimateMessageSize(subject: string, bodyHtml?: string, bodyText?: string): number {
  let size = 0;
  
  // Headers (approximate)
  size += 500;
  
  // Subject
  size += Buffer.byteLength(subject, 'utf-8');
  
  // Body
  if (bodyHtml) {
    size += Buffer.byteLength(bodyHtml, 'utf-8');
  }
  if (bodyText) {
    size += Buffer.byteLength(bodyText, 'utf-8');
  }
  
  // MIME overhead
  size = Math.ceil(size * 1.37); // Base64 + MIME = ~37% overhead
  
  return size;
}

/**
 * Generate human-readable score explanation
 */
type ScoreFactor = { description?: string; value?: number };
type ScoreWithFactors = { factors?: ScoreFactor[] } | { factors: ScoreFactor[] };

function generateScoreExplanation(score: ScoreWithFactors): string {
  const parts: string[] = [];

  for (const factor of score.factors ?? []) {
    const value = typeof factor.value === 'number' ? factor.value : 0;
    if (value !== 0) {
      const sign = value > 0 ? '+' : '';
      const desc = factor.description ?? 'Facteur';
      parts.push(`${desc} (${sign}${value})`);
    }
  }

  return parts.join(', ');
}
