import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { identityUpdateSchema } from '@/lib/validator';
import { logger } from '@/lib/logger';

export async function PATCH(
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
    const body = await request.json();
    const result = identityUpdateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    // Verify SMTP account if provided
    if (result.data.defaultSmtpAccountId) {
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
    }
    
    const identity = await prisma.identity.update({
      where: {
        id: params.id,
        orgId: session.orgId,
      },
      data: result.data,
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
    
    logger.info({ orgId: session.orgId, identityId: identity.id }, 'Identity updated');
    
    return NextResponse.json(identity);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId, id: params.id }, 'Failed to update identity');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    await prisma.identity.delete({
      where: {
        id: params.id,
        orgId: session.orgId,
      },
    });
    
    logger.info({ orgId: session.orgId, identityId: params.id }, 'Identity deleted');
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId, id: params.id }, 'Failed to delete identity');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
