import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { publishDmarcRecord, canAdjustDmarc } from '@/lib/dmarc';
import { logger } from '@/lib/logger';

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
    const { domainConfigId } = body;
    
    if (!domainConfigId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'domainConfigId requis' } },
        { status: 400 }
      );
    }
    
    // Verify domain belongs to org
    const domain = await prisma.domainConfig.findFirst({
      where: {
        id: domainConfigId,
        orgId: session.orgId,
      },
    });
    
    if (!domain) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Configuration domaine non trouvée' } },
        { status: 404 }
      );
    }
    
    // Check if allowed to publish
    const canPublish = await canAdjustDmarc(domainConfigId);
    if (!canPublish.allowed) {
      return NextResponse.json(
        { error: { code: 'NOT_ALLOWED', message: canPublish.reason } },
        { status: 400 }
      );
    }
    
    // Publish
    const result = await publishDmarcRecord(domainConfigId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'PUBLISH_FAILED', message: result.error } },
        { status: 400 }
      );
    }
    
    // Update last published timestamp (schema uses lastDmarcAdjustedAt)
    await prisma.domainConfig.update({
      where: { id: domainConfigId },
      data: { lastDmarcAdjustedAt: new Date() },
    });
    
    logger.info({ orgId: session.orgId, domainConfigId, domain: domain.domain }, 'DMARC published');
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'DMARC publish failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
