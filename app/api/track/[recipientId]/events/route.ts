import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/track/[recipientId]/events
 * Récupérer les événements de tracking pour un recipient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { recipientId: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { recipientId } = params;

  try {
    // Vérifier que le recipient appartient à l'organisation
    const recipient = await prisma.recipient.findFirst({
      where: {
        id: recipientId,
        message: {
          orgId: authResult.session.orgId,
        },
      },
      include: {
        trackingEvents: {
          orderBy: { eventAt: 'desc' },
        },
        message: {
          select: {
            subject: true,
            trackingEnabled: true,
          },
        },
      },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Recipient non trouvé' } },
        { status: 404 }
      );
    }

    // Calculer les statistiques
    const opens = recipient.trackingEvents.filter(e => e.eventType === 'opened').length;
    const clicks = recipient.trackingEvents.filter(e => e.eventType === 'clicked').length;
    const firstOpen = recipient.trackingEvents.find(e => e.eventType === 'opened');
    const lastOpen = recipient.trackingEvents.filter(e => e.eventType === 'opened').pop();

    return NextResponse.json({
      recipient: {
        id: recipient.id,
        toEmail: recipient.toEmail,
        sentAt: recipient.sentAt,
        trackingId: recipient.trackingId,
        trackingEnabled: recipient.message.trackingEnabled,
      },
      stats: {
        opens,
        clicks,
        firstOpenedAt: firstOpen?.eventAt,
        lastOpenedAt: lastOpen?.eventAt,
      },
      events: recipient.trackingEvents.map(event => ({
        id: event.id,
        eventType: event.eventType,
        userAgent: event.userAgent,
        ipAddress: event.ip,
        metadata: event.metadata ? JSON.parse(event.metadata) : null,
        createdAt: event.eventAt,
      })),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, recipientId }, 'Failed to get tracking events');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
