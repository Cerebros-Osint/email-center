import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { verifyPassword } from './crypto';
import { generateToken } from './crypto';

const SESSION_COOKIE = 'session';
const CSRF_COOKIE = 'csrf-token';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface Session {
  userId: string;
  email: string;
  orgId: string;
  role: string;
  createdAt: number;
}

/**
 * Create a new session for user
 */
export async function createSession(
  userId: string,
  email: string,
  orgId: string,
  role: string
): Promise<string> {
  const sessionToken = generateToken(32);
  const session: Session = {
    userId,
    email,
    orgId,
    role,
    createdAt: Date.now(),
  };
  
  // Store session in Redis (or could use encrypted cookie)
  const { redis } = await import('./redis');
  await redis.setex(`session:${sessionToken}`, SESSION_MAX_AGE, JSON.stringify(session));
  
  return sessionToken;
}

/**
 * Get session from request
 */
export async function getSession(_request?: NextRequest): Promise<Session | null> {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    
    if (!sessionToken) {
      return null;
    }
    
    const { redis } = await import('./redis');
    const sessionData = await redis.get(`session:${sessionToken}`);
    
    if (!sessionData) {
      return null;
    }
    
    return JSON.parse(sessionData);
  } catch {
    return null;
  }
}

/**
 * Destroy session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  
  if (sessionToken) {
    const { redis } = await import('./redis');
    await redis.del(`session:${sessionToken}`);
  }
  
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

/**
 * Set session cookie
 */
export function setSessionCookie(response: NextResponse, sessionToken: string): void {
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  
  // Also set CSRF token
  const csrfToken = generateToken(32);
  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false, // Accessible to JS for headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Authenticate user with email and password
 */
export async function authenticate(
  email: string,
  password: string
): Promise<{ userId: string; orgId: string; role: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      orgs: {
        include: {
          org: true,
        },
        take: 1, // Get first org
      },
    },
  });
  
  if (!user || user.orgs.length === 0) {
    return null;
  }
  
  const validPassword = await verifyPassword(user.passwordHash, password);
  if (!validPassword) {
    return null;
  }
  
  const orgUser = user.orgs[0];
  
  return {
    userId: user.id,
    orgId: orgUser.orgId,
    role: orgUser.role,
  };
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  const cookieStore = cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get('x-csrf-token');
  
  return cookieToken === headerToken && !!cookieToken;
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ session: Session } | NextResponse> {
  const session = await getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentification requise' } },
      { status: 401 }
    );
  }
  
  return { session };
}

/**
 * Require specific role
 */
export function requireRole(session: Session, allowedRoles: string[]): boolean {
  return allowedRoles.includes(session.role);
}
