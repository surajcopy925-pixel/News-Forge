import { NextResponse } from 'next/server';
import { casparClient } from '@/lib/caspar-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!casparClient.getStatus().connected) {
      return NextResponse.json(
        { error: 'CasparCG is not connected', status: casparClient.getStatus() },
        { status: 503 }
      );
    }

    const files = await casparClient.listMedia();
    return NextResponse.json({ files, total: files.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load media' },
      { status: 500 }
    );
  }
}
