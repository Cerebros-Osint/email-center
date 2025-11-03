import { Worker, Job } from 'bullmq';
import { performPreflight } from '../lib/preflight';
import { logger } from '../lib/logger';
import { connection } from '../lib/redis';

interface PreflightJobData {
  orgId: string;
  messageId: string;
  recipients: string[];
  subject: string;
  bodyHtml: string;
}

const preflightWorker = new Worker<PreflightJobData>(
  'preflight',
  async (job: Job<PreflightJobData>) => {
    const { orgId, messageId, recipients, subject, bodyHtml } = job.data;
    
    logger.info({ messageId, recipientCount: recipients.length }, 'Processing preflight job');
    
    try {
      const result = await performPreflight({
        orgId,
        recipients,
        subject,
        bodyHtml,
      });
      
      if (!result.canSend) {
        logger.warn({ messageId, blockers: result.blockers }, 'Preflight failed');
        return { success: false, result };
      }
      
      // Queue send jobs for each valid recipient
      const validRecipients = result.recipients.filter((r) => r.valid && !r.isSuppressed && r.errors.length === 0);
      
      logger.info(
        { messageId, validCount: validRecipients.length },
        'Preflight passed, queueing sends'
      );
      
      return { success: true, result };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, messageId }, 'Preflight job failed');
      if (error instanceof Error) throw error;
      throw new Error(errMsg);
    }
  },
  {
    connection: connection as any,
    concurrency: 10,
  }
);

preflightWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Preflight job completed');
});

preflightWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Preflight job failed');
});

export default preflightWorker;
