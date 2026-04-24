import { NextRequest, NextResponse } from 'next/server';
import casparClient from '@/lib/caspar-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ch = body.channel || 1;
    const ly = body.layer; // undefined = clear entire channel

    if (!casparClient.isConnected()) {
      return NextResponse.json(
        { success: false, error: 'Not connected' },
        { status: 500 }
      );
    }

    const result = await casparClient.clear(ch, ly);

    return NextResponse.json({
      success: result.code === 202,
      command: `CLEAR ${ch}${ly ? `-${ly}` : ''}`,
      code: result.code,
      message: result.message,
    });
  } catch (error) {
    console.error('[caspar/clear] ERROR:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
