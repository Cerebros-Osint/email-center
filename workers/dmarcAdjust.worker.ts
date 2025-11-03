import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/db';
import { calculateDmarcKPIs, getNextDmarcPolicy, canAdjustDmarc, publishDmarcRecord } from '../lib/dmarc';
import { logger } from '../lib/logger';
import { dmarcPolicyChanges } from '../lib/metrics';
import { connection } from '../lib/redis';

interface DmarcAdjustJobData {
  domainConfigId: string;
  orgId: string;
}

const dmarcAdjustWorker = new Worker<DmarcAdjustJobData>(
  'dmarcAdjust',
  async (job: Job<DmarcAdjustJobData>) => {
    const { domainConfigId, orgId } = job.data;
    
    logger.info({ domainConfigId, orgId }, 'Processing DMARC adjust job');
    
    try {
      const domainConfig = await prisma.domainConfig.findUnique({
        where: { id: domainConfigId },
      });
      
      if (!domainConfig) {
        throw new Error('Domain config not found');
      }
      
      // Check if allowed to adjust
      const canAdjust = await canAdjustDmarc(domainConfigId);
      if (!canAdjust.allowed) {
        logger.info(
          { domainConfigId, reason: canAdjust.reason },
          'DMARC adjustment not allowed'
        );
        return { success: false, reason: canAdjust.reason };
      }
      
      // Calculate KPIs
      const kpis = await calculateDmarcKPIs(domainConfig.domain, orgId);
      
      // Get current and next policy
      const currentState = {
        policy: domainConfig.dmarcPolicy,
        pct: domainConfig.dmarcPct,
        aspf: domainConfig.aspf,
        adkim: domainConfig.adkim,
      };
      
      const nextPolicy = getNextDmarcPolicy(currentState, kpis);
      
      if (!nextPolicy) {
        logger.info({ domainConfigId, currentState, kpis }, 'No DMARC advancement needed');
        return { success: true, advanced: false };
      }
      
      // Update domain config
      await prisma.domainConfig.update({
        where: { id: domainConfigId },
        data: {
          dmarcPolicy: nextPolicy.policy,
          dmarcPct: nextPolicy.pct,
          aspf: nextPolicy.aspf,
          adkim: nextPolicy.adkim,
        },
      });
      
      // Publish to DNS
      const publishResult = await publishDmarcRecord(domainConfigId);
      
      if (!publishResult.success) {
        logger.warn(
          { domainConfigId, error: publishResult.error },
          'DMARC publish failed after adjustment'
        );
        // Don't fail the job, just log the issue
      }
      
      // Update metric
      dmarcPolicyChanges.inc({
        org_id: orgId,
        domain: domainConfig.domain,
        from_policy: currentState.policy,
        to_policy: nextPolicy.policy,
      });
      
      logger.info(
        {
          domainConfigId,
          domain: domainConfig.domain,
          from: currentState.policy,
          to: nextPolicy.policy,
          published: publishResult.success,
        },
        'DMARC policy adjusted'
      );
      
      return {
        success: true,
        advanced: true,
        from: currentState,
        to: nextPolicy,
        published: publishResult.success,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, domainConfigId }, 'DMARC adjust job failed');
      if (error instanceof Error) throw error;
      throw new Error(errMsg);
    }
  },
  {
    connection: connection as any,
    concurrency: 2,
  }
);

dmarcAdjustWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'DMARC adjust job completed');
});

dmarcAdjustWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'DMARC adjust job failed');
});

export default dmarcAdjustWorker;
