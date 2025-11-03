import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrfToken } from './auth';
import { checkApiRateLimit, checkLoginRateLimit } from './rate-limiter';
import { logger } from './logger';

/**
 * CSRF Protection Middleware
 * Verifies CSRF token for state-changing operations
 */
export async function withCsrfProtection(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const method = request.method;
  
  // Only check CSRF for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!verifyCsrfToken(request)) {
      logger.warn({ 
        path: request.nextUrl.pathname,
        method 
      }, 'CSRF token validation failed');
      
      return NextResponse.json(
        { error: { code: 'CSRF_ERROR', message: 'Invalid CSRF token' } },
        { status: 403 }
      );
    }
  }
  
  return handler();
}

/**
 * Rate Limiting Middleware
 * Applies rate limiting based on route type
 */
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  type: 'api' | 'login' = 'api'
): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  let rateLimitResult;
  
  if (type === 'login') {
    try {
      const body = await request.clone().json();
      const email = body.email || ip;
      rateLimitResult = await checkLoginRateLimit(email);
    } catch {
      rateLimitResult = await checkApiRateLimit(ip);
    }
  } else {
    rateLimitResult = await checkApiRateLimit(ip);
  }
  
  if (!rateLimitResult.allowed) {
    logger.warn({ 
      ip,
      path: request.nextUrl.pathname,
      type 
    }, 'Rate limit exceeded');
    
    const retryAfter = rateLimitResult.resetAt 
      ? Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)
      : 60;
    
    return NextResponse.json(
      { 
        error: { 
          code: 'RATE_LIMIT_EXCEEDED', 
          message: 'Trop de requêtes, veuillez réessayer plus tard',
          retryAfter 
        } 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter)
        }
      }
    );
  }
  
  return handler();
}

/**
 * Combined Middleware
 * Applies both CSRF protection and rate limiting
 */
export async function withProtection(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options?: {
    csrf?: boolean;
    rateLimit?: boolean;
    rateLimitType?: 'api' | 'login';
  }
): Promise<NextResponse> {
  const { csrf = true, rateLimit = true, rateLimitType = 'api' } = options || {};
  
  // Apply rate limiting first
  if (rateLimit) {
    const rateLimitCheck = await withRateLimit(
      request, 
      async () => NextResponse.next(), 
      rateLimitType
    );
    
    if (rateLimitCheck.status === 429) {
      return rateLimitCheck;
    }
  }
  
  // Then apply CSRF protection
  if (csrf) {
    return withCsrfProtection(request, handler);
  }
  
  return handler();
}
