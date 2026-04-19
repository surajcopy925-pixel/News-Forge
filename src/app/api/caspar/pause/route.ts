// src/app/api/caspar/pause/route.ts
import { NextRequest, NextResponse } from 'next/server';
import casparClient from '@/lib/caspar-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ch = body.channel || 1;
    const ly = body.layer || 10;
    const action = body.action || 'pause';

    let result;
    if (action === 'resume') {
      result = await casparClient.resume(ch, ly);
    } else {
      result = await casparClient.pause(ch, ly);
    }

    return NextResponse.json({
      success: result.code === 202,
      command: `${action.toUpperCase()} ${ch}-${ly}`,
      code: result.code,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
