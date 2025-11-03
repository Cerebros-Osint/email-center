import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  // Only Owner/Admin can toggle kill switch
  if (!requireRole(session, ['Owner', 'Admin'])) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès refusé' } },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json();
    const { enabled } = body;
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'enabled doit être un boolean' } },
        { status: 400 }
      );
    }
    
    const settings = await prisma.orgSettings.upsert({
      where: { orgId: session.orgId },
      create: {
        orgId: session.orgId,
        killSwitch: enabled,
      },
      update: {
        killSwitch: enabled,
      },
    });
    
    logger.warn(
      { orgId: session.orgId, userId: session.userId, enabled },
      'Kill switch toggled'
    );
    
    return NextResponse.json({
      success: true,
      killSwitch: settings.killSwitch,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to toggle kill switch');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
