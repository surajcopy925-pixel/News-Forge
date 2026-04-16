import { NextRequest, NextResponse } from 'next/server';
import { mosBridge } from '@/lib/mos-bridge';

export async function POST(req: NextRequest) {
  if (!mosBridge.status.connected) {
    return NextResponse.json(
      { error: 'MOS bridge not connected', status: mosBridge.status },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { type, roId, storyId, itemId } = body;

  let message: string;

  switch (type) {
    case 'cue':
      if (!roId || !storyId || !itemId) {
        return NextResponse.json(
          { error: 'roId, storyId, itemId required for cue' },
          { status: 400 }
        );
      }
      message = mosBridge.buildRoItemCue(roId, storyId, itemId);
      break;

    case 'take':
      if (!roId || !storyId || !itemId) {
        return NextResponse.json(
          { error: 'roId, storyId, itemId required for take' },
          { status: 400 }
        );
      }
      message = mosBridge.buildRoItemTake(roId, storyId, itemId);
      break;

    case 'clear':
      if (!roId || !storyId || !itemId) {
        return NextResponse.json(
          { error: 'roId, storyId, itemId required for clear' },
          { status: 400 }
        );
      }
      message = mosBridge.buildRoItemClear(roId, storyId, itemId);
      break;

    case 'deleteRo':
      if (!roId) {
        return NextResponse.json(
          { error: 'roId required for deleteRo' },
          { status: 400 }
        );
      }
      message = mosBridge.buildRoDelete(roId);
      break;

    case 'raw':
      if (!body.xml) {
        return NextResponse.json(
          { error: 'xml required for raw message' },
          { status: 400 }
        );
      }
      message = body.xml as string;
      break;

    default:
      return NextResponse.json(
        { error: 'type must be: cue, take, clear, deleteRo, raw' },
        { status: 400 }
      );
  }

  const sent = mosBridge.sendMessage(message);

  return NextResponse.json({
    success: sent,
    type,
    messageLength: message.length,
    status: mosBridge.status,
  });
}
