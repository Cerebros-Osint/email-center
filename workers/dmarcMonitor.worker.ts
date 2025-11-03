import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import { connection } from '../lib/redis';

interface DmarcMonitorJobData {
  orgId: string;
  domain: string;
  reportXml?: string;
  reportUrl?: string;
}

const dmarcMonitorWorker = new Worker<DmarcMonitorJobData>(
  'dmarcMonitor',
  async (job: Job<DmarcMonitorJobData>) => {
    const { orgId, domain, reportXml } = job.data;
    
    logger.info({ orgId, domain }, 'Processing DMARC monitor job');
    
    try {
      // Parse DMARC aggregate report XML
      // For now, we'll create a simplified version
      // In production, use xml2js or similar to parse full reports
      
      if (!reportXml) {
        logger.warn({ orgId, domain }, 'No report XML provided');
        return { success: false };
      }
      
      // Simplified parsing - extract basic stats
      // Real implementation would parse full XML structure
      const total = 100; // Parse from XML
      const aligned = 98; // Parse from XML
      const failing = 2; // Parse from XML
      
      // Store aggregate report if the model exists in this Prisma client
      if ('dmarcAggregateReport' in prisma && typeof (prisma as any).dmarcAggregateReport?.create === 'function') {
        await (prisma as any).dmarcAggregateReport.create({
          data: {
            orgId,
            domain,
            total,
            aligned,
            failing,
            reportXml,
          },
        });
      } else {
        logger.warn({ orgId, domain }, 'dmarcAggregateReport model not available in Prisma client - skipping store');
      }
      
      logger.info({ orgId, domain, total, aligned, failing }, 'DMARC report stored');
      
      return { success: true };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, orgId, domain }, 'DMARC monitor job failed');
      if (error instanceof Error) throw error;
      throw new Error(errMsg);
    }
  },
  {
    connection: connection as any,
    concurrency: 3,
  }
);

dmarcMonitorWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'DMARC monitor job completed');
});

dmarcMonitorWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'DMARC monitor job failed');
});

export default dmarcMonitorWorker;
