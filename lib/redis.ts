import Redis from 'ioredis';
import type { Redis as IORedisClient } from 'ioredis';
import { Queue, QueueEvents } from 'bullmq';

const redisUrl = process.env.REDIS_URL; // if not provided, we avoid creating real clients during build
const redisTlsOptions = redisUrl?.startsWith('rediss://')
  ? { tls: { rejectUnauthorized: false as const } }
  : {};

// Minimal stub interface for when Redis is unavailable (tests/build)
type RedisStub = {
  ping: () => Promise<string>;
  set: (...args: unknown[]) => Promise<null | string>;
  del: (...args: unknown[]) => Promise<number | null>;
  multi: () => { exec: () => Promise<unknown[]> };
  incr: (key: string) => Promise<number>;
  expire: (...args: unknown[]) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  // Common Redis commands used across the codebase
  get: (key: string) => Promise<string | null>;
  setex: (key: string, seconds: number, value: string) => Promise<string | null>;
  exists: (key: string) => Promise<number>;
  ttl: (key: string) => Promise<number>;
  zremrangebyscore: (...args: unknown[]) => Promise<number>;
  zcard: (key: string) => Promise<number>;
  zadd: (...args: unknown[]) => Promise<number>;
  eval: (...args: unknown[]) => Promise<unknown>;
};

// Redis client for general use (either real client or a stub)
export let redis: IORedisClient | RedisStub;

if (redisUrl) {
  try {
    // Use lazyConnect so the client does not attempt network connections during
    // Next.js build / static data collection. Connection will be established
    // at runtime when needed.
    redis = new Redis(redisUrl, {
      ...redisTlsOptions,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      // Avoid aggressive retry loops during build/test if server is not available
      retryStrategy: () => null,
    }) as IORedisClient;

    // Prevent unhandled error events from crashing the build
    redis.on('error', (_err: unknown) => {
      // intentionally swallow during build/test
    });
  } catch (e) {
    // If construction throws synchronously (rare), fallback to stub
    redis = createRedisStub();
  }
} else {
  // No REDIS_URL provided — use a safe no-op stub so builds/tests don't require Redis
  redis = createRedisStub();
}

function createRedisStub(): RedisStub {
  return {
    ping: async () => 'PONG',
    set: async () => null,
    del: async () => null,
    multi: () => ({ exec: async () => [] }),
    incr: async () => 0,
    expire: async () => null,
    on: () => {},
    // Implement common commands as no-ops / safe defaults
    get: async () => null,
    setex: async () => null,
    exists: async () => 0,
    ttl: async () => -1,
    zremrangebyscore: async () => 0,
    zcard: async () => 0,
    zadd: async () => 0,
    eval: async () => null,
  };
}

// Redis connection for BullMQ
export let connection: IORedisClient | null = null;
if (redisUrl) {
  try {
    connection = new Redis(redisUrl, {
      ...redisTlsOptions,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
    }) as IORedisClient;
    connection.on('error', () => {});
  } catch (e) {
    connection = null;
  }
} else {
  connection = null;
}

// Queue definitions
export const queues: Record<string, Queue | undefined> = {};
export const queueEvents: Record<string, QueueEvents | undefined> = {};

// Only initialize BullMQ queues if we have a working connection
if (connection) {
  queues.preflight = new Queue('preflight', { connection });
  queues.send = new Queue('send', { connection });
  queues.imapPoll = new Queue('imapPoll', { connection });
  queues.dnsCheck = new Queue('dnsCheck', { connection });
  queues.dmarcMonitor = new Queue('dmarcMonitor', { connection });
  queues.dmarcAdjust = new Queue('dmarcAdjust', { connection });
  queues.dkimRotate = new Queue('dkimRotate', { connection });

  // Queue events for monitoring
  queueEvents.preflight = new QueueEvents('preflight', { connection });
  queueEvents.send = new QueueEvents('send', { connection });
  queueEvents.imapPoll = new QueueEvents('imapPoll', { connection });
  queueEvents.dnsCheck = new QueueEvents('dnsCheck', { connection });
  queueEvents.dmarcMonitor = new QueueEvents('dmarcMonitor', { connection });
  queueEvents.dmarcAdjust = new QueueEvents('dmarcAdjust', { connection });
  queueEvents.dkimRotate = new QueueEvents('dkimRotate', { connection });
}

// Helper for distributed locking
export async function acquireLock(
  key: string,
  ttlSeconds: number = 30
): Promise<boolean> {
  const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  await redis.del(key);
}

// Rate limiting helpers
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; current: number }> {
  // Run commands sequentially to avoid depending on `multi()` shape in the stub.
  const current = await redis.incr(key).catch(() => 0);
  await redis.expire(key, windowSeconds).catch(() => null);

  const num = typeof current === 'number' ? current : Number(current || 0);
  return {
    allowed: (num || 0) <= limit,
    current: num || 0,
  };
}

export default redis;
