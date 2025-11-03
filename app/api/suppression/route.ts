import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const addSuppressionSchema = z.object({
  email: z.string().email(),
  reason: z.enum(['bounce', 'complaint', 'unsubscribe', 'manual']),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const suppressions = await prisma.suppressedRecipient.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    const total = await prisma.suppressedRecipient.count({
      where: { orgId: session.orgId },
    });
    
    return NextResponse.json({
      suppressions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to get suppression list');
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
    const result = addSuppressionSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    // Upsert to avoid duplicates
    const suppression = await prisma.suppressedRecipient.upsert({
      where: {
        orgId_email: {
          orgId: session.orgId,
          email: result.data.email,
        },
      },
      create: {
        orgId: session.orgId,
        email: result.data.email,
        reason: result.data.reason,
      },
      update: {
        reason: result.data.reason,
      },
    });
    
    logger.info(
      { orgId: session.orgId, email: result.data.email, reason: result.data.reason },
      'Email added to suppression list'
    );
    
    return NextResponse.json(suppression);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to add suppression');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email requis' } },
        { status: 400 }
      );
    }
    
    await prisma.suppressedRecipient.delete({
      where: {
        orgId_email: {
          orgId: session.orgId,
          email,
        },
      },
    });
    
    logger.info({ orgId: session.orgId, email }, 'Email removed from suppression list');
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to remove suppression');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
