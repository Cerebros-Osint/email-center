import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { smtpAccountUpdateSchema } from '@/lib/validator';
import { encrypt } from '@/lib/crypto';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const result = smtpAccountUpdateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
        { status: 400 }
      );
    }
    
    const { password, ...data } = result.data;

    // Narrow the update shape to the SMTP account fields we accept
    type SmtpUpdate = Partial<{
      name: string;
      host: string;
      port: number;
      secure: boolean;
      fromEmail: string | null;
      fromName: string | null;
      provider: string | null;
      // other allowed fields from validator schema can be added here
    }>;

    const updateData: SmtpUpdate & { passwordEnc?: string } = { ...data } as SmtpUpdate;

    // Encrypt password if provided
    if (password) {
      // encrypt returns a Buffer - persist as base64 string
      const enc = await encrypt(password);
      updateData.passwordEnc = typeof enc === 'string' ? enc : Buffer.isBuffer(enc) ? enc.toString('base64') : String(enc);
    }

    // Build a minimal object for Prisma update to avoid passing nulls where not allowed
    const prismaData: Record<string, unknown> = {};
    for (const key of Object.keys(updateData) as Array<keyof typeof updateData>) {
      const val = updateData[key];
      // skip undefined values
      if (val === undefined) continue;
      // skip explicit nulls for fields where null might be invalid; allow strings and numbers and booleans and null for safe fields
      prismaData[key as string] = val;
    }

    const account = await prisma.smtpAccount.update({
      where: {
        id: params.id,
        orgId: session.orgId,
      },
      data: prismaData as any,
    });
    
    logger.info({ orgId: session.orgId, smtpAccountId: account.id }, 'SMTP account updated');
    
    return NextResponse.json({
      ...account,
      passwordEnc: undefined,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId, id: params.id }, 'Failed to update SMTP account');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    await prisma.smtpAccount.delete({
      where: {
        id: params.id,
        orgId: session.orgId,
      },
    });
    
    logger.info({ orgId: session.orgId, smtpAccountId: params.id }, 'SMTP account deleted');
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, orgId: session.orgId, id: params.id }, 'Failed to delete SMTP account');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
