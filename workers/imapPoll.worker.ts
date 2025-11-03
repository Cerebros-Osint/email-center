import { Worker, Job } from 'bullmq';
import { pollImap } from '../lib/imap';
import { logger } from '../lib/logger';
import { emailsReceivedTotal } from '../lib/metrics';
import { connection } from '../lib/redis';

interface ImapPollJobData {
  orgId: string;
}

const imapPollWorker = new Worker<ImapPollJobData>(
  'imapPoll',
  async (job: Job<ImapPollJobData>) => {
    const { orgId } = job.data;
    
    logger.info({ orgId }, 'Polling IMAP');
    
    try {
      const count = await pollImap(orgId);
      
      emailsReceivedTotal.inc({ org_id: orgId }, count);
      
      logger.info({ orgId, count }, 'IMAP poll completed');
      
      return { success: true, count };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, orgId }, 'IMAP poll failed');
      if (error instanceof Error) throw error;
      throw new Error(errMsg);
    }
  },
  {
    connection: connection as any,
    concurrency: 1, // One poll at a time
  }
);

imapPollWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'IMAP poll job completed');
});

imapPollWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'IMAP poll job failed');
});

export default imapPollWorker;
