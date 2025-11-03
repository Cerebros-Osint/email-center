import { redis } from './redis';
import { logger } from './logger';
import { RATE_LIMITS } from './constants';

/**
 * Rate limiter basé sur Redis
 * Utilise un sliding window pour un comptage précis
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export interface RateLimitConfig {
  key: string;
  points: number;
  durationSeconds: number;
  blockDurationSeconds?: number;
}

/**
 * Vérifier et consommer un point du rate limit
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { key, points, durationSeconds, blockDurationSeconds } = config;
  
  try {
    const now = Date.now();
    const windowStart = now - (durationSeconds * 1000);
    
    // Clé pour le rate limit
    const rateLimitKey = `rate_limit:${key}`;
    const blockKey = `rate_limit:blocked:${key}`;
    
    // Vérifier si bloqué
    const isBlocked = await redis.exists(blockKey);
    if (isBlocked) {
      const ttl = await redis.ttl(blockKey);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + (ttl * 1000)),
        retryAfter: ttl > 0 ? ttl : 60,
      };
    }
    
  // Utiliser Redis sorted set pour sliding window.
  // Pour éviter des casts `any` liés au client stub, exécuter les commandes
  // séquentiellement (moins atomique mais acceptable pour les environnements
  // sans Redis réel). Si vous avez besoin d'atomicité stricte, restorez
  // l'utilisation de `multi()` avec un client Redis réel.
  await redis.zremrangebyscore(rateLimitKey, '-inf', windowStart);

  // Compter les requêtes dans la fenêtre (après purge)
  const count = (await redis.zcard(rateLimitKey)) || 0;

  // Ajouter la requête actuelle (score as string to satisfy stub and typings)
  await redis.zadd(rateLimitKey, String(now), `${now}-${Math.random()}`);

  // Définir l'expiration de la clé
  await redis.expire(rateLimitKey, durationSeconds);
    const remaining = Math.max(0, points - count - 1);
    
  // Si limite dépassée
  if (count >= points) {
      // Bloquer si blockDuration spécifié
      if (blockDurationSeconds) {
        await redis.setex(blockKey, blockDurationSeconds, '1');
        
        logger.warn(
          { key, count, points, blockDurationSeconds },
          'Rate limit exceeded - blocking'
        );
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + (durationSeconds * 1000)),
        retryAfter: durationSeconds,
      };
    }
    
    return {
      allowed: true,
      remaining,
      resetAt: new Date(now + (durationSeconds * 1000)),
    };
  } catch (error) {
    logger.error({ error, key }, 'Rate limit check failed');
    
    // En cas d'erreur Redis, permettre la requête (fail open)
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(Date.now() + (durationSeconds * 1000)),
    };
  }
}

/**
 * Rate limiter pour les tentatives de login
 */
export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit({
    key: `login:${identifier}`,
    points: RATE_LIMITS.LOGIN_ATTEMPTS,
    durationSeconds: RATE_LIMITS.LOGIN_WINDOW_SECONDS,
    blockDurationSeconds: RATE_LIMITS.LOGIN_BLOCK_DURATION_SECONDS,
  });
}

/**
 * Rate limiter pour les requêtes API
 */
export async function checkApiRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit({
    key: `api:${userId}`,
    points: RATE_LIMITS.API_REQUESTS_PER_MINUTE,
    durationSeconds: 60,
  });
}

/**
 * Rate limiter pour l'envoi de messages
 */
export async function checkMessageSendRateLimit(
  userId: string
): Promise<RateLimitResult> {
  return checkRateLimit({
    key: `send:${userId}`,
    points: RATE_LIMITS.MESSAGE_SEND_PER_MINUTE,
    durationSeconds: 60,
  });
}

/**
 * Réinitialiser le rate limit pour une clé
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redis.del(`rate_limit:${key}`);
    await redis.del(`rate_limit:blocked:${key}`);
    logger.info({ key }, 'Rate limit reset');
  } catch (error) {
    logger.error({ error, key }, 'Failed to reset rate limit');
  }
}

/**
 * Obtenir les informations de rate limit sans consommer
 */
export async function getRateLimitInfo(config: RateLimitConfig): Promise<RateLimitResult> {
  const { key, points, durationSeconds } = config;
  
  try {
    const now = Date.now();
    const windowStart = now - (durationSeconds * 1000);
    const rateLimitKey = `rate_limit:${key}`;
    const blockKey = `rate_limit:blocked:${key}`;
    
    // Vérifier si bloqué
    const isBlocked = await redis.exists(blockKey);
    if (isBlocked) {
      const ttl = await redis.ttl(blockKey);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + (ttl * 1000)),
      };
    }
    
    // Compter sans modifier
    await redis.zremrangebyscore(rateLimitKey, '-inf', windowStart);
    const count = await redis.zcard(rateLimitKey);
    
    const remaining = Math.max(0, points - count);
    const allowed = count < points;
    
    return {
      allowed,
      remaining,
      resetAt: new Date(now + (durationSeconds * 1000)),
    };
  } catch (error) {
    logger.error({ error, key }, 'Failed to get rate limit info');
    return {
      allowed: true,
      remaining: points,
      resetAt: new Date(Date.now() + (durationSeconds * 1000)),
    };
  }
}
