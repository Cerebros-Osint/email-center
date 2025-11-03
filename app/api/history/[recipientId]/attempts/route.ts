import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { recipientId: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    // Verify recipient belongs to org's message
    const recipient = await prisma.recipient.findFirst({
      where: {
        id: params.recipientId,
        message: {
          orgId: session.orgId,
        },
      },
      include: {
        message: {
          select: {
            subject: true,
            identity: {
              select: {
                displayName: true,
                fromEmail: true,
              },
            },
          },
        },
        attempts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!recipient) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Destinataire non trouvé' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json(recipient);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, recipientId: params.recipientId }, 'Failed to get attempts');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
