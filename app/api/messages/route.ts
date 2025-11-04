import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { messageSchema } from '@/lib/validator';
import { logger } from '@/lib/logger';
import { generateToken } from '@/lib/crypto';
import { withProtection } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  return withProtection(request, async () => {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    
    const { session } = authResult;
    
    try {
    const body = await request.json();
    const validationResult = messageSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: validationResult.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    // Verify identity belongs to org
    const identity = await prisma.identity.findFirst({
      where: {
        id: validationResult.data.identityId,
        orgId: session.orgId,
      },
    });
    
    if (!identity) {
      return NextResponse.json(
        { error: { code: 'INVALID_IDENTITY', message: 'Identité invalide' } },
        { status: 400 }
      );
    }
    
    // Generate reply token
    const replyToToken = generateToken();
    
    // Create message and recipients in transaction
    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          orgId: session.orgId,
          userId: session.userId,
          identityId: validationResult.data.identityId,
          subject: validationResult.data.subject,
          bodyHtml: validationResult.data.bodyHtml || '',
          bodyText: validationResult.data.bodyText || '',
          customDisplayName: validationResult.data.customDisplayName,
          trackingEnabled: validationResult.data.trackingEnabled !== false,
          status: 'draft',
          replyToToken,
        },
      });
      
      const recipients = await Promise.all(
        validationResult.data.recipients.map((email) =>
          tx.recipient.create({
            data: {
              messageId: message.id,
              toEmail: email,
              sendStatus: 'pending',
            },
          })
        )
      );
      
      return { message, recipients };
    });
    
    logger.info(
      { orgId: session.orgId, messageId: result.message.id, recipientCount: result.recipients.length },
      'Message created'
    );
    
    return NextResponse.json({
      message: result.message,
      recipients: result.recipients,
    });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, orgId: session.orgId }, 'Failed to create message');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
        { status: 500 }
      );
    }
  });
}
