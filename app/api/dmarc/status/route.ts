import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateDmarcKPIs, getNextDmarcPolicy } from '@/lib/dmarc';
import { logger } from '@/lib/logger';

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
    
    // Calculate KPIs
    const kpis = await calculateDmarcKPIs(domain.domain, session.orgId);
    
    // Get current state
    const currentState = {
      policy: domain.dmarcPolicy,
      pct: domain.dmarcPct,
      aspf: domain.aspf,
      adkim: domain.adkim,
    };
    
    // Get next policy
    const nextPolicy = getNextDmarcPolicy(currentState, kpis);
    
    return NextResponse.json({
      domain: domain.domain,
      current: currentState,
      kpis,
      next: nextPolicy,
      canAdvance: nextPolicy !== null,
      lastPublished: domain.lastDmarcAdjustedAt || domain.lastDnsCheckAt || null,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to get DMARC status');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
