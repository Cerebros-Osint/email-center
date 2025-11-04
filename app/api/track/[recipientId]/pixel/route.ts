import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Pixel transparent 1x1 en base64
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  request: NextRequest,
  { params }: { params: { recipientId: string } }
) {
  const { recipientId } = params;

  try {
    // Récupérer les informations de la requête
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || '';

    // Trouver le recipient soit par trackingId soit par id
    const recipient = await prisma.recipient.findFirst({
      where: {
        OR: [
          { trackingId: recipientId },
          { id: recipientId },
        ],
      },
      include: {
        message: {
          include: {
            identity: true,
          },
        },
      },
    });

    if (!recipient) {
      logger.warn({ recipientId }, 'Tracking ID / Recipient not found');
      return new NextResponse(PIXEL_GIF, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Vérifier si l'ouverture a déjà été enregistrée (dans les dernières 5 minutes)
    const recentOpen = await prisma.trackingEvent.findFirst({
      where: {
        recipientId: recipient.id,
        eventType: 'opened',
        eventAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes
        },
      },
    });

    if (!recentOpen) {
      // Enregistrer l'événement d'ouverture
      await prisma.trackingEvent.create({
        data: {
          recipientId: recipient.id,
          eventType: 'opened',
          userAgent: userAgent.substring(0, 500),
          ip: ipAddress.substring(0, 100),
          metadata: JSON.stringify({
            referer: request.headers.get('referer') || '',
            acceptLanguage: request.headers.get('accept-language') || '',
          }),
        },
      });

      logger.info(
        {
          recipientId,
          recipientEmail: recipient.toEmail,
          messageId: recipient.messageId,
        },
        'Email opened'
      );
    }

    // Retourner le pixel transparent
    return new NextResponse(PIXEL_GIF, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, recipientId }, 'Tracking pixel error');

    // Toujours retourner le pixel même en cas d'erreur
    return new NextResponse(PIXEL_GIF, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
