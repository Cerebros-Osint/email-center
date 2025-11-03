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
import { queues, queueEvents, connection } from '../lib/redis';

// Fail-fast if Redis is not available
if (!connection) {
  logger.error('❌ Redis connection not available. Cannot start workers.');
  logger.error('Please ensure REDIS_URL is set and Redis server is running.');
  process.exit(1);
}

// Schedule recurring jobs
async function scheduleRecurringJobs() {
  try {
    if (!queues.imapPoll) {
      throw new Error('imapPoll queue not initialized');
    }

    // Check if recurring job already exists to avoid duplicates
    const repeatableJobs = await queues.imapPoll.getRepeatableJobs();
    const existingJob = repeatableJobs.find(j => j.key?.includes('poll'));
    
    if (existingJob) {
      logger.info('IMAP poll job already scheduled, skipping');
    } else {
      // IMAP poll every 2 minutes
      await queues.imapPoll.add(
        'poll',
        { orgId: 'default' }, // In real app, iterate through all orgs
        {
          repeat: {
            every: 2 * 60 * 1000, // 2 minutes
          },
        }
      );
      logger.info('✓ IMAP poll job scheduled (every 2 minutes)');
    }
  } catch (error) {
    logger.error('Failed to schedule recurring jobs:', error);
    throw error;
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down workers...');
  
  try {
    // Close all workers
    await Promise.all([
      sendWorker.close(),
      imapPollWorker.close(),
      preflightWorker.close(),
      dnsCheckWorker.close(),
      dmarcMonitorWorker.close(),
      dmarcAdjustWorker.close(),
      dkimRotateWorker.close(),
    ]);

    // Close all queue events
    if (queueEvents.preflight) await queueEvents.preflight.close();
    if (queueEvents.send) await queueEvents.send.close();
    if (queueEvents.imapPoll) await queueEvents.imapPoll.close();
    if (queueEvents.dnsCheck) await queueEvents.dnsCheck.close();
    if (queueEvents.dmarcMonitor) await queueEvents.dmarcMonitor.close();
    if (queueEvents.dmarcAdjust) await queueEvents.dmarcAdjust.close();
    if (queueEvents.dkimRotate) await queueEvents.dkimRotate.close();

    // Close all queues
    if (queues.preflight) await queues.preflight.close();
    if (queues.send) await queues.send.close();
    if (queues.imapPoll) await queues.imapPoll.close();
    if (queues.dnsCheck) await queues.dnsCheck.close();
    if (queues.dmarcMonitor) await queues.dmarcMonitor.close();
    if (queues.dmarcAdjust) await queues.dmarcAdjust.close();
    if (queues.dkimRotate) await queues.dkimRotate.close();

    // Close Redis connection
    if (connection) {
      await connection.quit();
      logger.info('✓ Redis connection closed');
    }

    logger.info('✓ All workers shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start workers
async function startWorkers() {
  try {
    logger.info('Starting all 7 workers...');
    
    // Wait for scheduling to complete
    await scheduleRecurringJobs();
    
    logger.info('✓ Workers started successfully');
    logger.info('Workers running:');
    logger.info('  - Send Worker (concurrency: 5)');
    logger.info('  - Preflight Worker (concurrency: 10)');
    logger.info('  - IMAP Poll Worker (concurrency: 1)');
    logger.info('  - DNS Check Worker (concurrency: 5)');
    logger.info('  - DMARC Monitor Worker (concurrency: 3)');
    logger.info('  - DMARC Adjust Worker (concurrency: 2)');
    logger.info('  - DKIM Rotate Worker (concurrency: 2)');
  } catch (error) {
    logger.error('Failed to start workers:', error);
    process.exit(1);
  }
}

startWorkers();
