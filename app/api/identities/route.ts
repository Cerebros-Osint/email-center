import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { identitySchema } from '@/lib/validator';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    const identities = await prisma.identity.findMany({
      where: { orgId: session.orgId },
      include: {
        defaultSmtpAccount: {
          select: {
            id: true,
            provider: true,
            fromEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(identities);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to get identities');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  if (!requireRole(session, ['Owner', 'Admin'])) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès refusé' } },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json();
    const result = identitySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    // Verify SMTP account belongs to org
    const smtpAccount = await prisma.smtpAccount.findFirst({
      where: {
        id: result.data.defaultSmtpAccountId,
        orgId: session.orgId,
      },
    });
    
    if (!smtpAccount) {
      return NextResponse.json(
        { error: { code: 'INVALID_SMTP', message: 'Compte SMTP invalide' } },
        { status: 400 }
      );
    }
    
    const identity = await prisma.identity.create({
      data: {
        ...result.data,
        orgId: session.orgId,
      },
      include: {
        defaultSmtpAccount: {
          select: {
            id: true,
            provider: true,
            fromEmail: true,
          },
        },
      },
    });
    
    logger.info({ orgId: session.orgId, identityId: identity.id }, 'Identity created');
    
    return NextResponse.json(identity);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to create identity');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
