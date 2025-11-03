import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/db';
import { checkSpf, checkDkim, checkDmarc } from '../lib/dns';
import { logger } from '../lib/logger';
import { connection } from '../lib/redis';

interface DnsCheckJobData {
  domainConfigId: string;
  orgId: string;
}

const dnsCheckWorker = new Worker<DnsCheckJobData>(
  'dnsCheck',
  async (job: Job<DnsCheckJobData>) => {
    const { domainConfigId, orgId } = job.data;
    
    logger.info({ domainConfigId, orgId }, 'Processing DNS check job');
    
    try {
      const domainConfig = await prisma.domainConfig.findUnique({
        where: { id: domainConfigId },
      });
      
      if (!domainConfig) {
        throw new Error('Domain config not found');
      }
      
      // Check all DNS records
      const [spf, dkim, dmarc] = await Promise.all([
        checkSpf(domainConfig.domain),
        domainConfig.dkimSelectorCurrent
          ? checkDkim(domainConfig.domain, domainConfig.dkimSelectorCurrent)
          : null,
        checkDmarc(domainConfig.domain),
      ]);
      
      // Update domain config with results
      await prisma.domainConfig.update({
        where: { id: domainConfigId },
        data: {
          lastDnsCheckAt: new Date(),
        },
      });
      
      logger.info(
        {
          domainConfigId,
          domain: domainConfig.domain,
          spf: spf.exists,
          dkim: dkim?.exists,
          dmarc: dmarc.exists,
        },
        'DNS check completed'
      );
      
      return { success: true, spf, dkim, dmarc };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, domainConfigId }, 'DNS check job failed');
      if (error instanceof Error) throw error;
      throw new Error(errMsg);
    }
  },
  {
    connection: connection as any,
    concurrency: 5,
  }
);

dnsCheckWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'DNS check job completed');
});

dnsCheckWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'DNS check job failed');
});

export default dnsCheckWorker;
