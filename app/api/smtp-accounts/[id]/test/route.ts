import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { testSmtpConnection } from '@/lib/smtp';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    // Verify account belongs to org
    const account = await prisma.smtpAccount.findFirst({
      where: {
        id: params.id,
        orgId: session.orgId,
      },
    });
    
    if (!account) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Compte SMTP non trouvé' } },
        { status: 404 }
      );
    }
    
    // Test connection
    const result = await testSmtpConnection(params.id);
    
    // Store capabilities if successful
    if (result.success) {
      await prisma.providerCapabilities.upsert({
        where: { smtpAccountId: params.id },
        create: {
          smtpAccountId: params.id,
          ...result.capabilities,
          lastTestAt: new Date(),
        },
        update: {
          ...result.capabilities,
          lastTestAt: new Date(),
        },
      });
    }
    
    logger.info(
      { orgId: session.orgId, smtpAccountId: params.id, success: result.success },
      'SMTP connection tested'
    );
    
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId, id: params.id }, 'Failed to test SMTP connection');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
