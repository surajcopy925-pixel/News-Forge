import { NextRequest, NextResponse } from 'next/server';
import { casparClient } from '@/lib/caspar-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(casparClient.getStatus());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === 'connect') {
      casparClient.connect();
      return NextResponse.json({ success: true, status: casparClient.getStatus() });
    }

    if (action === 'disconnect') {
      casparClient.disconnect();
      return NextResponse.json({ success: true, status: casparClient.getStatus() });
    }

    return NextResponse.json(
      { error: 'action must be "connect" or "disconnect"' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
