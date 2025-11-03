import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    const message = await prisma.inboundMessage.findFirst({
      where: {
        id: params.id,
        orgId: session.orgId,
      },
    });
    
    if (!message) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Message non trouvé' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json(message);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, id: params.id }, 'Failed to get inbox message');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
