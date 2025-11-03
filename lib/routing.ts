import { prisma } from './db';
import { redis, checkRateLimit } from './redis';

export interface RoutingContext {
  orgId: string;
  recipientEmail: string;
  mxHint: string;
}

export interface SmtpScore {
  smtpAccountId: string;
  score: number;
  factors: Array<{ key: string; value: number; description: string }>;
  provider: string;
  capabilities: {
    starttls: boolean;
    pipelining: boolean;
    size: number | null;
    latency: number | null;
  };
}

/**
 * Score and rank SMTP accounts for a given recipient
 */
export async function scoreSmtpAccounts(ctx: RoutingContext): Promise<SmtpScore[]> {
  // Get all active SMTP accounts for the org
  const accounts = await prisma.smtpAccount.findMany({
    where: {
      orgId: ctx.orgId,
      status: 'active',
    },
    include: {
      capabilities: true,
    },
  });
  
  if (accounts.length === 0) {
    throw new Error('No active SMTP accounts available');
  }
  
  // Score each account
  const scored = await Promise.all(
    accounts.map(async (account) => {
      const factors: Array<{ key: string; value: number; description: string }> = [];
      let score = 0;
      
      // Base score: success rate for this MX hint (24-72h window)
      const successRate = await getSuccessRate(account.id, ctx.mxHint);
      const successScore = Math.round(successRate * 60);
      factors.push({
        key: 'success_rate',
        value: successScore,
        description: `Taux de succès ${(successRate * 100).toFixed(1)}% pour ${ctx.mxHint}`,
      });
      score += successScore;
      
      // Uptime score
      const uptime = await getUptime(account.id);
      const uptimeScore = Math.round(uptime * 10);
      factors.push({
        key: 'uptime',
        value: uptimeScore,
        description: `Disponibilité ${(uptime * 100).toFixed(1)}%`,
      });
      score += uptimeScore;
      
      // Recent bounces penalty
      const recentBounces = await getRecentBounces(account.id);
      const bouncePenalty = -Math.min(10, recentBounces);
      factors.push({
        key: 'recent_bounces',
        value: bouncePenalty,
        description: `${recentBounces} rebonds récents`,
      });
      score += bouncePenalty;
      
      // Rate limit penalty
      const rateLimitPenalty = await checkAccountRateLimit(account.id, account.rateLimitPerMin);
      factors.push({
        key: 'rate_limit',
        value: rateLimitPenalty,
        description: rateLimitPenalty < 0 ? 'Proche de la limite' : 'Capacité disponible',
      });
      score += rateLimitPenalty;
      
      // Capabilities bonus
      if (account.capabilities) {
        if (account.capabilities.starttls) {
          factors.push({ key: 'starttls', value: 5, description: 'Support STARTTLS' });
          score += 5;
        }
        if (account.capabilities.pipelining) {
          factors.push({ key: 'pipelining', value: 3, description: 'Support PIPELINING' });
          score += 3;
        }
        if (account.capabilities.size && account.capabilities.size > 10 * 1024 * 1024) {
          factors.push({ key: 'size', value: 2, description: 'Grande taille supportée' });
          score += 2;
        }
        
        // Latency penalty
        if (account.capabilities.latencyMs) {
          const latencyPenalty = -Math.min(5, Math.floor(account.capabilities.latencyMs / 200));
          factors.push({
            key: 'latency',
            value: latencyPenalty,
            description: `Latence ${account.capabilities.latencyMs}ms`,
          });
          score += latencyPenalty;
        }
      }
      
      return {
        smtpAccountId: account.id,
        score: Math.max(0, Math.min(100, score)),
        factors,
        provider: account.provider,
        capabilities: {
          starttls: account.capabilities?.starttls || false,
          pipelining: account.capabilities?.pipelining || false,
          size: account.capabilities?.size || null,
          latency: account.capabilities?.latencyMs || null,
        },
      };
    })
  );
  
  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Get success rate for an SMTP account and MX hint
 */
async function getSuccessRate(smtpAccountId: string, mxHint: string): Promise<number> {
  const key = `stats:success:${smtpAccountId}:${mxHint}`;
  const cached = await redis.get(key);
  
  if (cached) {
    return parseFloat(cached);
  }
  
  // Query from database (last 72h)
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
  
  const attempts = await prisma.sendAttempt.findMany({
    where: {
      smtpAccountId,
      createdAt: { gte: since },
      recipient: {
        mxDomain: mxHint,
      },
    },
  });
  
  if (attempts.length === 0) {
    return 0.8; // Default optimistic score for new accounts
  }
  
  const successful = attempts.filter((a) => a.result === 'ok').length;
  const rate = successful / attempts.length;
  
  // Cache for 10 minutes
  await redis.setex(key, 600, rate.toString());
  
  return rate;
}

/**
 * Get uptime for an SMTP account
 */
async function getUptime(smtpAccountId: string): Promise<number> {
  const key = `stats:uptime:${smtpAccountId}`;
  const cached = await redis.get(key);
  
  if (cached) {
    return parseFloat(cached);
  }
  
  // Simplified: assume 99% uptime unless we have failure data
  const uptime = 0.99;
  await redis.setex(key, 600, uptime.toString());
  
  return uptime;
}

/**
 * Get recent bounces count
 */
async function getRecentBounces(smtpAccountId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h
  
  const bounces = await prisma.sendAttempt.count({
    where: {
      smtpAccountId,
      result: 'fail',
      createdAt: { gte: since },
      responseRaw: {
        contains: '5.', // 5xx SMTP errors
      },
    },
  });
  
  return bounces;
}

/**
 * Check if account is near rate limit
 */
async function checkAccountRateLimit(
  smtpAccountId: string,
  rateLimitPerMin: number | null
): Promise<number> {
  if (!rateLimitPerMin) {
    return 0; // No penalty if no limit set
  }
  
  const key = `ratelimit:smtp:${smtpAccountId}`;
  const result = await checkRateLimit(key, rateLimitPerMin, 60);
  
  const usage = result.current / rateLimitPerMin;
  
  if (usage >= 0.9) {
    return -10; // Heavy penalty if near limit
  } else if (usage >= 0.7) {
    return -5; // Moderate penalty
  }
  
  return 0;
}

/**
 * Acquire per-MX semaphore for concurrency control
 */
export async function acquireMxSemaphore(mxDomain: string): Promise<boolean> {
  const key = `semaphore:mx:${mxDomain}`;
  const maxConcurrent = 2; // Max 2 concurrent connections per MX domain
  const ttl = 300; // seconds

  // Use an atomic Lua script to incr and enforce the limit to avoid races
  const lua = `
    local current = redis.call('incr', KEYS[1])
    redis.call('expire', KEYS[1], ARGV[2])
    if current > tonumber(ARGV[1]) then
      redis.call('decr', KEYS[1])
      return 0
    end
    return current
  `;

  const result = await redis.eval(lua, 1, key, String(maxConcurrent), String(ttl));

  // redis.eval returns number or buffer — coerce to number
  const current = typeof result === 'number' ? result : parseInt(String(result), 10) || 0;

  return current > 0;
}

/**
 * Release per-MX semaphore
 */
export async function releaseMxSemaphore(mxDomain: string): Promise<void> {
  const key = `semaphore:mx:${mxDomain}`;

  // Decrement but ensure counter never goes negative
  const lua = `
    local current = redis.call('decr', KEYS[1])
    if current < 0 then
      redis.call('set', KEYS[1], 0)
      return 0
    end
    return current
  `;

  await redis.eval(lua, 1, key);
}

/**
 * Calculate backoff delay with jitter
 */
export function calculateBackoff(attemptNumber: number, baseMs: number = 1000): number {
  const exponential = baseMs * Math.pow(1.7, attemptNumber);
  const jitter = exponential * (0.8 + Math.random() * 0.4);
  return Math.round(Math.min(jitter, 60000)); // Max 60s
}
