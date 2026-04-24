import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/rundowns/live
// Returns all LIVE rundowns with entries, stories, and ALL clips
// Used by the standalone playout app on port 3030

export async function GET(request: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { searchParams } = new URL(request.url);
    const rundownId = searchParams.get('rundownId');

    // If a specific rundown ID is requested, return that rundown with full clip data
    if (rundownId) {
      const rundown = await prisma.rundown.findUnique({
        where: { rundownId },
        include: {
          entries: {
            orderBy: { orderIndex: 'asc' },
            include: {
              story: {
                include: {
                  clips: {
                    orderBy: { createdAt: 'asc' },
                  },
                },
              },
            },
          },
        },
      });

      if (!rundown) {
        return NextResponse.json(
          { error: 'Rundown not found' },
          { status: 404, headers }
        );
      }

      // Flatten into a playout-friendly structure
      const playoutEntries = rundown.entries
        .filter((entry: any) => entry.story)
        .map((entry: any) => ({
          entryId: entry.entryId,
          orderIndex: entry.orderIndex,
          storyId: entry.story.storyId,
          storyTitle: entry.story.title,
          storyFormat: entry.story.format || 'NEWS',
          clips: (entry.story.clips || [])
            .filter((clip: any) => clip.fileName)
            .map((clip: any) => ({
              clipId: clip.clipId,
              fileName: clip.fileName,
              playoutName: clip.playoutName || clip.fileName,
              duration: clip.duration || '00:00:00',
              status: clip.status || 'READY',
              fileUrl: clip.fileUrl || '',
              proxyUrl: clip.proxyUrl || '',
            })),
        }));

      return NextResponse.json(
        {
          rundown: {
            rundownId: rundown.rundownId,
            title: rundown.title,
            date: rundown.date,
            broadcastTime: rundown.broadcastTime,
            status: rundown.status,
            plannedDuration: rundown.plannedDuration,
          },
          entries: playoutEntries,
        },
        { headers }
      );
    }

    // No rundownId — return list of all LIVE rundowns (summary only)
    const liveRundowns = await prisma.rundown.findMany({
      where: {
        status: { in: ['LIVE', 'PLANNING'] },
      },
      orderBy: [{ date: 'desc' }, { broadcastTime: 'asc' }],
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    const rundownList = liveRundowns.map((r: any) => ({
      rundownId: r.rundownId,
      title: r.title,
      date: r.date,
      broadcastTime: r.broadcastTime,
      status: r.status,
      plannedDuration: r.plannedDuration,
      entryCount: r._count.entries,
    }));

    return NextResponse.json({ rundowns: rundownList }, { headers });
  } catch (error) {
    console.error('[API] /api/rundowns/live error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rundown data' },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
