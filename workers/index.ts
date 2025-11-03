/**
 * Worker process entry point
 * Starts all BullMQ workers
 */

import sendWorker from './send.worker';
import imapPollWorker from './imapPoll.worker';
import preflightWorker from './preflight.worker';
import dnsCheckWorker from './dnsCheck.worker';
import dmarcMonitorWorker from './dmarcMonitor.worker';
import dmarcAdjustWorker from './dmarcAdjust.worker';
import dkimRotateWorker from './dkimRotate.worker';
import { logger } from '../lib/logger';
import { queues } from '../lib/redis';

// Schedule recurring jobs
async function scheduleRecurringJobs() {
  // IMAP poll every 2 minutes
  await queues.imapPoll?.add(
    'poll',
    { orgId: 'default' }, // In real app, iterate through all orgs
    {
      repeat: {
        every: 2 * 60 * 1000, // 2 minutes
      },
    }
  );
  
  logger.info('Recurring jobs scheduled');
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down workers...');
  
  await Promise.all([
    sendWorker.close(),
    imapPollWorker.close(),
    preflightWorker.close(),
    dnsCheckWorker.close(),
    dmarcMonitorWorker.close(),
    dmarcAdjustWorker.close(),
    dkimRotateWorker.close(),
  ]);
  
  logger.info('Workers shut down');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start
logger.info('Starting all 7 workers...');
scheduleRecurringJobs();
logger.info('Workers started');
