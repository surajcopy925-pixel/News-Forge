import { NextRequest, NextResponse } from 'next/server';
import { mosBridge } from '@/lib/mos-bridge';

// GET — Bridge status
export async function GET() {
  return NextResponse.json(mosBridge.status);
}

// POST — Start or stop the MOS TCP server
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'start' || action === 'connect') {
    if (mosBridge.status.running) {
      return NextResponse.json({
        success: true,
        message: 'MOS server already running',
        status: mosBridge.status,
      });
    }

    try {
      await mosBridge.start();
      return NextResponse.json({
        success: true,
        message: `MOS server started — listening on :${process.env.MOS_LOWER_PORT || 10546} / :${process.env.MOS_UPPER_PORT || 10545}. Waiting for Viz Gateway to connect.`,
        status: mosBridge.status,
      });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: (err as Error).message,
          status: mosBridge.status,
        },
        { status: 500 }
      );
    }
  }

  if (action === 'stop' || action === 'disconnect') {
    mosBridge.stop();
    return NextResponse.json({
      success: true,
      message: 'MOS server stopped',
      status: mosBridge.status,
    });
  }

  return NextResponse.json(
    { error: 'action must be "start" or "stop"' },
    { status: 400 }
  );
}
