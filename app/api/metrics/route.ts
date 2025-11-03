import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/metrics';

export async function GET() {
  try {
    const metrics = await getMetrics();
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to collect metrics' } },
      { status: 500 }
    );
  }
}
