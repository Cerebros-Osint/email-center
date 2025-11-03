import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { unsubscribesTotal } from '@/lib/metrics';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return new NextResponse('Token manquant', { status: 400 });
    }
    
    // Find message by reply token
    const message = await prisma.message.findUnique({
      where: { replyToToken: token },
      include: {
        recipients: {
          take: 1,
        },
      },
    });
    
    if (!message || message.recipients.length === 0) {
      return new NextResponse('Token invalide', { status: 404 });
    }
    
    const email = message.recipients[0].toEmail;
    
    // Add to suppression list
    await prisma.suppressedRecipient.upsert({
      where: {
        orgId_email: {
          orgId: message.orgId,
          email,
        },
      },
      create: {
        orgId: message.orgId,
        email,
        reason: 'unsubscribe',
      },
      update: {
        reason: 'unsubscribe',
      },
    });
    
    // Update metric
    unsubscribesTotal.inc({ org_id: message.orgId, method: 'one_click' });
    
    logger.info({ orgId: message.orgId, email, token }, 'One-Click unsubscribe processed');
    
    // Return success (RFC 8058 requires simple response)
    return new NextResponse('Unsubscribed', { status: 200 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg }, 'Unsubscribe failed');
    return new NextResponse('Erreur serveur', { status: 500 });
  }
}

// GET for manual unsubscribe page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return new NextResponse(
        '<html><body><h1>Erreur</h1><p>Token manquant</p></body></html>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
    
    // Find message by reply token
    const message = await prisma.message.findUnique({
      where: { replyToToken: token },
      include: {
        recipients: {
          take: 1,
        },
        identity: {
          select: {
            displayName: true,
          },
        },
      },
    });
    
    if (!message || message.recipients.length === 0) {
      return new NextResponse(
        '<html><body><h1>Erreur</h1><p>Token invalide ou expiré</p></body></html>',
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
    
    const email = message.recipients[0].toEmail;
    
    // Check if already unsubscribed
    const existing = await prisma.suppressedRecipient.findUnique({
      where: {
        orgId_email: {
          orgId: message.orgId,
          email,
        },
      },
    });
    
    if (existing) {
      return new NextResponse(
        `<html><body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
          <h1>✓ Déjà désabonné</h1>
          <p>L'adresse <strong>${email}</strong> est déjà désabonnée.</p>
        </body></html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
    
    // Show unsubscribe confirmation page
    return new NextResponse(
      `<html><body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
        <h1>Se désabonner</h1>
        <p>Souhaitez-vous vous désabonner des emails de <strong>${message.identity.displayName}</strong> ?</p>
        <p>Adresse : <strong>${email}</strong></p>
        <form method="POST" action="/api/unsubscribe?token=${token}">
          <button type="submit" style="background: #dc2626; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin-top: 20px;">
            Confirmer le désabonnement
          </button>
        </form>
      </body></html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg }, 'Unsubscribe page failed');
    return new NextResponse(
      '<html><body><h1>Erreur</h1><p>Erreur serveur</p></body></html>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}
