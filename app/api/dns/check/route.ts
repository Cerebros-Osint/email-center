import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { checkSpf, checkDkim, checkDmarc, getMx } from '@/lib/dns';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const dnsCheckSchema = z.object({
  domain: z.string().min(1),
  dkimSelector: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { session } = authResult;
  
  if (!requireRole(session, ['Owner', 'Admin'])) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès refusé' } },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json();
    const result = dnsCheckSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    const { domain, dkimSelector } = result.data;
    
    // Check all DNS records in parallel
    const [spf, dkim, dmarc, mx] = await Promise.all([
      checkSpf(domain),
      dkimSelector ? checkDkim(domain, dkimSelector) : null,
      checkDmarc(domain),
      getMx(domain),
    ]);
    
    logger.info({ domain, orgId: session.orgId }, 'DNS check completed');
    
    return NextResponse.json({
      domain,
      spf,
      dkim: dkim || { exists: false, valid: false },
      dmarc,
      mx,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId }, 'DNS check failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
