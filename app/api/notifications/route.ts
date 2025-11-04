import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/notifications
 * Récupérer toutes les notifications (tracking events + send attempts)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Récupérer tous les événements de tracking
    const trackingEvents = await prisma.trackingEvent.findMany({
      where: {
        recipient: {
          message: {
            orgId: authResult.session.orgId,
          },
        },
      },
      include: {
        recipient: {
          include: {
            message: {
              select: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        eventAt: 'desc',
      },
      take: limit,
    });

    // Récupérer les échecs d'envoi
    const failedAttempts = await prisma.sendAttempt.findMany({
      where: {
        result: 'fail',
        recipient: {
          message: {
            orgId: authResult.session.orgId,
          },
        },
      },
      include: {
        recipient: {
          include: {
            message: {
              select: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit / 2,
    });

    // Combiner et formater les notifications
    const notifications = [
      ...trackingEvents.map(event => ({
        id: event.id,
        type: event.eventType,
        recipientEmail: event.recipient.toEmail,
        messageSubject: event.recipient.message.subject,
        userAgent: event.userAgent,
        ipAddress: event.ip,
        createdAt: event.eventAt,
      })),
      ...failedAttempts.map(attempt => ({
        id: attempt.id,
        type: 'failed',
        recipientEmail: attempt.recipient.toEmail,
        messageSubject: attempt.recipient.message.subject,
        userAgent: null,
        ipAddress: null,
        createdAt: attempt.createdAt,
      })),
    ];

    // Trier par date décroissante
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Limiter au nombre demandé
    const limitedNotifications = notifications.slice(0, limit);

    return NextResponse.json({
      notifications: limitedNotifications,
      total: notifications.length,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg }, 'Failed to get notifications');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
