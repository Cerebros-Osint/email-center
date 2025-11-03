import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { preflightSchema } from '@/lib/validator';
import { performPreflight } from '@/lib/preflight';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  try {
    const body = await request.json();
    const result = preflightSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    const preflightResult = await performPreflight({
      orgId: session.orgId,
      ...result.data,
    });
    
    logger.info(
      {
        orgId: session.orgId,
        recipientCount: result.data.recipients.length,
        canSend: preflightResult.canSend,
      },
      'Preflight completed'
    );
    
    return NextResponse.json(preflightResult);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'Preflight failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
