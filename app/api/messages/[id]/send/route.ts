import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { queues } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { withProtection } from '@/lib/middleware';
import { Job } from 'bullmq';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withProtection(request, async () => {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    
    const { session } = authResult;
  
  try {
    // Verify message belongs to org
    const message = await prisma.message.findFirst({
      where: {
        id: params.id,
        orgId: session.orgId,
      },
      include: {
        recipients: true,
      },
    });
    
    if (!message) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Message non trouvé' } },
        { status: 404 }
      );
    }
    
    // Check kill switch
    const orgSettings = await prisma.orgSettings.findUnique({
      where: { orgId: session.orgId },
    });
    
    if (orgSettings?.killSwitch) {
      return NextResponse.json(
        { error: { code: 'KILL_SWITCH', message: 'Envois désactivés (kill switch)' } },
        { status: 403 }
      );
    }
    
    // Queue all pending recipients
    const pendingRecipients = message.recipients.filter(
      (r) => r.sendStatus === 'pending'
    );
    
    if (pendingRecipients.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_RECIPIENTS', message: 'Aucun destinataire en attente' } },
        { status: 400 }
      );
    }
    
    // Add jobs to send queue
    const jobs = await Promise.all(
      pendingRecipients.map((recipient) =>
        queues.send?.add('send', {
          recipientId: recipient.id,
          messageId: message.id,
          orgId: session.orgId,
        })
      )
    );

  const validJobs = jobs.filter(Boolean) as Job[];

    logger.info(
      { orgId: session.orgId, messageId: message.id, jobCount: validJobs.length },
      'Message queued for sending'
    );

    return NextResponse.json({
      success: true,
      queued: validJobs.length,
      jobIds: validJobs.map((j) => j.id),
    });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, orgId: session.orgId, id: params.id }, 'Failed to send message');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
        { status: 500 }
      );
    }
  });
}
