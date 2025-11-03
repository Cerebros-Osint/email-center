import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { planDkimRotation, executeDkimRotation, getDkimRotationStatus } from '@/lib/dkim';
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
    const { domainConfigId, action } = body;
    
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
    
    if (action === 'plan') {
      const result = await planDkimRotation(domainConfigId);
      
      logger.info(
        { orgId: session.orgId, domainConfigId, selector: result.selector },
        'DKIM rotation planned'
      );
      
      return NextResponse.json(result);
    } else if (action === 'execute') {
      const result = await executeDkimRotation(domainConfigId);
      
      if (!result.success) {
        return NextResponse.json(
          { error: { code: 'EXECUTION_FAILED', message: result.error } },
          { status: 400 }
        );
      }
      
      logger.info({ orgId: session.orgId, domainConfigId }, 'DKIM rotation executed');
      
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: { code: 'INVALID_ACTION', message: 'Action doit être plan ou execute' } },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'DKIM rotation failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    const { searchParams } = new URL(request.url);
    const domainConfigId = searchParams.get('domainConfigId');
    
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
    
    const status = await getDkimRotationStatus(domainConfigId);
    
    return NextResponse.json(status);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to get DKIM rotation status');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
