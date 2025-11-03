import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validator';
import { prisma } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/crypto';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { checkLoginRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    const { email, password } = result.data;
    
    // Rate limit check - prevent brute force attacks
    const rateLimit = await checkLoginRateLimit(email);
    if (!rateLimit.allowed) {
      logger.warn({ email }, 'Login rate limit exceeded');
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' } },
        { status: 429 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        // Prisma schema uses 'orgs' relation for OrgUser entries
        orgs: {
          include: {
            org: true,
          },
        },
      },
    });
    
    if (!user) {
      logger.warn({ email }, 'Login failed - user not found');
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect' } },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      logger.warn({ email }, 'Login failed - invalid password');
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect' } },
        { status: 401 }
      );
    }
    
    // Check if user has org
    if (!user.orgs || user.orgs.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_ORG', message: 'Utilisateur sans organisation' } },
        { status: 403 }
      );
    }
    
    const orgUser = user.orgs[0];
    
    // Create session
    const sessionToken = generateToken(32);
    const sessionData = {
      userId: user.id,
      email: user.email,
      orgId: orgUser.orgId,
      role: orgUser.role,
    };
    
    // Store in Redis (7 days)
    await redis.setex(`session:${sessionToken}`, 7 * 24 * 60 * 60, JSON.stringify(sessionData));
    
    logger.info({ userId: user.id, orgId: orgUser.orgId }, 'User logged in');
    
    // Set cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        org: {
          id: orgUser.org.id,
          name: orgUser.org.name,
        },
        role: orgUser.role,
      },
    });
    
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    
    return response;
  } catch (error) {
    logger.error({ error }, 'Login error');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
