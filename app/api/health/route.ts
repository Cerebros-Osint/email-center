import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

export async function GET() {
  const checks: { status: 'healthy' | 'degraded' | 'unhealthy'; timestamp: string; services: Record<string, 'healthy' | 'unhealthy' | 'degraded' | 'unknown'> } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Helper: run a promise with timeout to avoid build hangs
  const withTimeout = async <T>(p: Promise<T>, ms = 800): Promise<T | null> => {
    return await Promise.race([
      p.then((r) => r).catch(() => null),
      new Promise<T | null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  };

  // Check database (fast, but guard with timeout)
  try {
    const dbRes = await withTimeout(prisma.$queryRaw`SELECT 1`);
    checks.services.database = dbRes ? 'healthy' : 'unhealthy';
    if (!dbRes) checks.status = 'degraded';
  } catch {
    checks.services.database = 'unhealthy';
    checks.status = 'degraded';
  }

  // Check Redis (guarded)
  try {
    const redisRes = await withTimeout((redis && typeof redis.ping === 'function') ? redis.ping() : Promise.resolve('PONG'));
    checks.services.redis = redisRes ? 'healthy' : 'unhealthy';
    if (!redisRes) checks.status = 'degraded';
  } catch {
    checks.services.redis = 'unhealthy';
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
