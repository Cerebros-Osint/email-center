import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { orgSettingsSchema } from '@/lib/validator';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    const settings = await prisma.orgSettings.findUnique({
      where: { orgId: session.orgId },
    });
    
    if (!settings) {
      // Create default settings
      const newSettings = await prisma.orgSettings.create({
        data: { orgId: session.orgId },
      });
      return NextResponse.json(newSettings);
    }
    
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to get org settings');
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
  
  // Only Admin/Owner can modify settings
  if (!requireRole(session, ['Owner', 'Admin'])) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès refusé' } },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json();
    const result = orgSettingsSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    const settings = await prisma.orgSettings.upsert({
      where: { orgId: session.orgId },
      create: {
        orgId: session.orgId,
        ...result.data,
      },
      update: result.data,
    });
    
    logger.info({ orgId: session.orgId, changes: result.data }, 'Org settings updated');
    
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to update org settings');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
