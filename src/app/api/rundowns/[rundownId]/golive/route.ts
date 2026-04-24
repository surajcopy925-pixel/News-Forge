import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ rundownId: string }> };

// PUT /api/rundowns/[rundownId]/golive — Toggle rundown LIVE status
export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { rundownId } = await params;
    const body = await request.json();
    const { live } = body; // true = go live, false = take off live

    if (live) {
      // GOING LIVE: First, take ALL other rundowns OFF live
      await prisma.rundown.updateMany({
        where: {
          status: 'LIVE',
          rundownId: { not: rundownId },
        },
        data: { status: 'READY' },
      });
      console.log(`[golive] Took all other rundowns off LIVE`);
    }

    const newStatus = live ? 'LIVE' : 'READY';

    const updated = await prisma.rundown.update({
      where: { rundownId },
      data: { status: newStatus },
    });

    console.log(`[golive] Rundown ${rundownId} status set to ${newStatus}`);

    return NextResponse.json({
      success: true,
      rundownId: updated.rundownId,
      status: updated.status,
    });
  } catch (error) {
    console.error('[golive] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
