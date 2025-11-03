import { Worker, Job } from 'bullmq';
import { connection } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/db';
import { sendEmail } from '../lib/smtp';
import { scoreSmtpAccounts, acquireMxSemaphore, releaseMxSemaphore } from '../lib/routing';
import { getMx } from '../lib/dns';
import { emailsSentTotal, smtpLatency } from '../lib/metrics';
import { generateTrackingId, prepareEmailWithTracking } from '../lib/tracking';

interface SendJobData {
  recipientId: string;
  messageId: string;
  orgId: string;
}

// Local lightweight types to avoid broad `any` casts
interface MessageWithIdentity {
  id: string;
  identity?: {
    id: string;
    displayName?: string | null;
    defaultSmtpAccount?: { id: string; fromEmail?: string | null } | null;
  } | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
  subject?: string | null;
  trackingEnabled?: boolean | null;
  customDisplayName?: string | null;
  replyToToken?: string | null;
}

const sendWorker = new Worker<SendJobData>(
  'send',
  async (job: Job<SendJobData>) => {
    const { recipientId, messageId, orgId } = job.data;
    
    logger.info({ recipientId, messageId }, 'Processing send job');
    
    // Get recipient and message
    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId },
      include: {
        message: {
          include: {
            identity: {
              include: {
                defaultSmtpAccount: true,
              },
            },
          },
        },
      },
    });
    
    if (!recipient || !recipient.message) {
      throw new Error('Recipient or message not found');
    }
    
  const message = recipient.message as unknown as MessageWithIdentity;
  const identity = message.identity ?? (null as MessageWithIdentity['identity']);
    
    // Check org kill switch
    const orgSettings = await prisma.orgSettings.findUnique({
      where: { orgId },
    });
    
    if (orgSettings?.killSwitch) {
      logger.warn({ orgId, recipientId }, 'Kill switch enabled, aborting send');
      await prisma.recipient.update({
        where: { id: recipientId },
        data: { sendStatus: 'failed' },
      });
      return { success: false, reason: 'Kill switch enabled' };
    }
    
    // Get MX for recipient domain
    const mxResult = await getMx(recipient.toEmail.split('@')[1]);
    
    // Update recipient with MX info
    await prisma.recipient.update({
      where: { id: recipientId },
      data: {
        mxDomain: mxResult.hint,
        mxRecordsJson: JSON.stringify(mxResult.records),
        lastMxCheckedAt: new Date(),
      },
    });
    
    // Acquire MX semaphore
    const acquired = await acquireMxSemaphore(mxResult.hint);
    if (!acquired) {
      logger.warn({ mxDomain: mxResult.hint }, 'MX semaphore unavailable, retrying');
      throw new Error('MX semaphore busy');
    }
    
    try {
      // Score SMTP accounts - ROUTING INTELLIGENT
      const scores = await scoreSmtpAccounts({
        orgId,
        recipientEmail: recipient.toEmail,
        mxHint: mxResult.hint,
      });
      
      if (scores.length === 0) {
        throw new Error('No SMTP accounts available');
      }
      
      // Generate tracking ID
      const trackingId = message.trackingEnabled !== false ? generateTrackingId() : null;
      if (trackingId) {
        await prisma.recipient.update({
          where: { id: recipientId },
          data: { trackingId },
        });
      }
      
      // Prepare email with tracking
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      let finalHtml = message.bodyHtml;
      if (trackingId && finalHtml) {
        finalHtml = prepareEmailWithTracking(
          finalHtml,
          recipientId,
          appUrl,
          message.trackingEnabled !== false
        );
      }
      
  // Try each SMTP account in order of score
  let lastError: unknown = null;
      
      for (const [index, smtpScore] of scores.entries()) {
        try {
          // DISPLAY NAME: Utiliser customDisplayName si présent, sinon identity
          const displayName = message.customDisplayName ?? identity?.displayName ?? '';
          
          // FROM EMAIL: Utiliser le SMTP account sélectionné par le routing intelligent
          const smtpAccount = await prisma.smtpAccount.findUnique({
            where: { id: smtpScore.smtpAccountId },
          });
          
          if (!smtpAccount) continue;
          
          const fromEmail = smtpAccount.fromEmail; // Email du SMTP sélectionné intelligemment
          
          // Build headers
          const headers: Record<string, string> = {
            'X-Mailer': 'Email-Software-Complet',
            'X-Message-ID': messageId,
            'X-Recipient-ID': recipientId,
            'List-Unsubscribe': `<${appUrl}/unsubscribe?token=${message.replyToToken}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          };
          
          // Send with INTELLIGENT ROUTING + CUSTOM DISPLAY NAME
          const result = await sendEmail({
            smtpAccountId: smtpScore.smtpAccountId,
            from: `${displayName} <${fromEmail}>`, // Display custom + Email intelligent
            to: recipient.toEmail,
            subject: message.subject ?? '',
            html: finalHtml ?? undefined,
            text: message.bodyText ?? undefined,
            headers,
          });
          
          // Record attempt
          await prisma.sendAttempt.create({
            data: {
              recipientId,
              smtpAccountId: smtpScore.smtpAccountId,
              providerMsgId: result.messageId,
              result: result.success ? 'ok' : 'fail',
              responseRaw: result.response || result.error,
              latencyMs: result.latencyMs,
            },
          });
          
          // Update metrics
          emailsSentTotal.inc({
            org_id: orgId,
            provider: smtpScore.provider,
            mx_hint: mxResult.hint,
            result: result.success ? 'success' : 'fail',
          });
          
          smtpLatency.observe(
            { smtp_account_id: smtpScore.smtpAccountId, provider: smtpScore.provider },
            result.latencyMs / 1000
          );
          
          if (result.success) {
            // Success!
            await prisma.recipient.update({
              where: { id: recipientId },
              data: {
                sendStatus: 'sent',
                sentAt: new Date(),
                routeSmtpAccountId: smtpScore.smtpAccountId,
              },
            });
            
            logger.info(
              {
                recipientId,
                smtpAccountId: smtpScore.smtpAccountId,
                displayName,
                fromEmail,
                latencyMs: result.latencyMs,
              },
              'Email sent successfully with intelligent routing'
            );
            
            return { success: true };
          } else {
            lastError = new Error(result.error);
            
            // If 4xx error and not last attempt, try next SMTP
            if (result.error?.includes('4') && index < scores.length - 1) {
              logger.warn(
                { recipientId, smtpAccountId: smtpScore.smtpAccountId, error: result.error },
                'Temporary failure, trying next SMTP'
              );
              continue;
            }
          }
        } catch (error: unknown) {
          lastError = error;
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error({ error: errMsg, recipientId, smtpAccountId: smtpScore.smtpAccountId }, 'Send attempt failed');

          // Record failed attempt
          await prisma.sendAttempt.create({
            data: {
              recipientId,
              smtpAccountId: smtpScore.smtpAccountId,
              result: 'fail',
              responseRaw: errMsg,
              latencyMs: 0,
            },
          });
        }
      }
      
      // All attempts failed
      await prisma.recipient.update({
        where: { id: recipientId },
        data: { sendStatus: 'failed' },
      });
      
      if (lastError) {
        if (lastError instanceof Error) throw lastError;
        throw new Error(String(lastError));
      }
      throw new Error('All SMTP attempts failed');
    } finally {
      await releaseMxSemaphore(mxResult.hint);
    }
  },
  {
    // connection may be a Redis client or a stub in test environments.
    // Keep a single narrowed cast here to avoid spreading `as any`.
    connection: connection as any,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

sendWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Send job completed');
});

sendWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Send job failed');
});

export default sendWorker;
