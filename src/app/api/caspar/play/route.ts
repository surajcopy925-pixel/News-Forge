import { NextRequest, NextResponse } from 'next/server';
import casparClient from '@/lib/caspar-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clip, channel, layer, loop } = body;

    if (!clip) {
      return NextResponse.json(
        { success: false, error: 'clip name is required' },
        { status: 400 }
      );
    }

    const ch = channel || 1;
    const ly = layer || 10;

    // Check connection first
    if (!casparClient.isConnected()) {
      try {
        await casparClient.connect();
      } catch (connErr) {
        return NextResponse.json(
          { success: false, error: `Not connected: ${connErr}` },
          { status: 500 }
        );
      }
    }

    let result;
    if (loop) {
      result = await casparClient.playLoop(ch, ly, clip);
    } else {
      result = await casparClient.play(ch, ly, clip);
    }

    return NextResponse.json({
      success: result.code === 202,
      command: `PLAY ${ch}-${ly} "${clip}"${loop ? ' LOOP' : ''}`,
      code: result.code,
      message: result.message,
    });
  } catch (error) {
    console.error('[caspar/play] ERROR:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
