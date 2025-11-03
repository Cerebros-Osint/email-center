import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status'); // pending, sent, failed, paused
    
    const where: { orgId: string } = { orgId: session.orgId };

    // Build filter
    const recipientWhere: { sendStatus?: string } = {};
    if (status) {
      recipientWhere.sendStatus = status;
    }
    
    // Get messages with recipients
    const messages = await prisma.message.findMany({
      where,
      include: {
        identity: {
          select: {
            displayName: true,
            fromEmail: true,
          },
        },
        recipients: {
          where: recipientWhere,
          include: {
            sendAttempts: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            smtpAccount: {
              select: {
                provider: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    // Count total
    const total = await prisma.message.count({ where });
    
    return NextResponse.json({
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to get history');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
