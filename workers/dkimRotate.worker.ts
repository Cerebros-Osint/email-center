import { Worker, Job } from 'bullmq';
import { executeDkimRotation } from '../lib/dkim';
import { logger } from '../lib/logger';
import { prisma } from '../lib/db';
import { connection } from '../lib/redis';

interface DkimRotateJobData {
  domainConfigId: string;
  orgId: string;
}

const dkimRotateWorker = new Worker<DkimRotateJobData>(
  'dkimRotate',
  async (job: Job<DkimRotateJobData>) => {
    const { domainConfigId, orgId } = job.data;
    
    logger.info({ domainConfigId, orgId }, 'Processing DKIM rotate job');
    
    try {
      // Check if rotation is due
      const domainConfig = await prisma.domainConfig.findUnique({
        where: { id: domainConfigId },
      });
      
      if (!domainConfig) {
        throw new Error('Domain config not found');
      }
      
      if (!domainConfig.dkimRotateAt) {
        logger.info({ domainConfigId }, 'No DKIM rotation scheduled');
        return { success: false, reason: 'No rotation scheduled' };
      }
      
      if (domainConfig.dkimRotateAt > new Date()) {
        logger.info(
          { domainConfigId, rotateAt: domainConfig.dkimRotateAt },
          'DKIM rotation not yet due'
        );
        return { success: false, reason: 'Not yet due' };
      }
      
      // Execute rotation
      const result = await executeDkimRotation(domainConfigId);
      
      if (!result.success) {
        logger.warn({ domainConfigId, error: result.error }, 'DKIM rotation failed');
        return { success: false, error: result.error };
      }
      
      logger.info({ domainConfigId, domain: domainConfig.domain }, 'DKIM rotation executed');
      
      return { success: true };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, domainConfigId }, 'DKIM rotate job failed');
      if (error instanceof Error) throw error;
      throw new Error(errMsg);
    }
  },
  {
    connection: connection as any,
    concurrency: 2,
  }
);

dkimRotateWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'DKIM rotate job completed');
});

dkimRotateWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'DKIM rotate job failed');
});

export default dkimRotateWorker;
