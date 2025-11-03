import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { smtpAccountSchema } from '@/lib/validator';
import { encrypt } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { withProtection } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    const accounts = await prisma.smtpAccount.findMany({
      where: { orgId: session.orgId },
      include: { capabilities: true },
      orderBy: { createdAt: 'desc' },
    });
    
    // Remove encrypted password from response
    const sanitized = accounts.map((acc) => ({
      ...acc,
      passwordEnc: undefined,
    }));
    
    return NextResponse.json(sanitized);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to get SMTP accounts');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return withProtection(request, async () => {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    
    const { session } = authResult;
    
    // Only Admin/Owner can create SMTP accounts
    if (!requireRole(session, ['Owner', 'Admin'])) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Accès refusé' } },
        { status: 403 }
      );
    }
    
    try {
      const body = await request.json();
    const result = smtpAccountSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    const { password, ...data } = result.data;
    
    // Encrypt password
    const passwordEnc = await encrypt(password);
    
    const account = await prisma.smtpAccount.create({
      data: {
        ...data,
        passwordEnc,
        orgId: session.orgId,
      },
    });
    
    logger.info(
      { orgId: session.orgId, smtpAccountId: account.id, provider: account.provider },
      'SMTP account created'
    );
    
    return NextResponse.json({
      ...account,
      passwordEnc: undefined,
    });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to create SMTP account');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
        { status: 500 }
      );
    }
  });
}
