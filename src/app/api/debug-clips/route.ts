// src/app/api/debug-clips/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all clips - Using storyClip as per schema
    const allClips = await (prisma as any).storyClip.findMany({
      take: 20,
    });

    // Get all stories that have clips
    const storiesWithClips = await prisma.story.findMany({
      where: {
        clips: {
          some: {},
        },
      },
      include: {
        clips: true,
      },
      take: 10,
    });

    // Get rundowns with story relations
    const rundownSample = await prisma.rundown.findFirst({
      include: {
        stories: {
          take: 3,
          include: {
            clips: true,
          },
        },
      },
    });

    return NextResponse.json({
      totalClips: allClips.length,
      clips: allClips.map((c: any) => ({
        id: c.id || c.clipId,
        storyId: c.storyId,
        fileName: c.fileName,
        filePath: (c as any).filePath || (c as any).fileUrl,
        allFields: Object.keys(c),
        allValues: c,
      })),
      storiesWithClips: storiesWithClips.map((s: any) => ({
        id: s.id || s.storyId,
        title: s.title,
        clipCount: s.clips?.length,
        clips: s.clips,
      })),
      rundownSample: rundownSample ? {
        id: rundownSample.rundownId,
        title: rundownSample.title,
        storyCount: (rundownSample as any).stories?.length,
        stories: (rundownSample as any).stories?.map((s: any) => ({
          id: s.id || s.storyId,
          title: s.title,
          clipCount: s.clips?.length,
          clipFileNames: s.clips?.map((c: any) => c.fileName),
        })),
      } : 'no rundowns',
    });
  } catch (error: any) {
    console.error('[debug-clips] ERROR:', error);
    return NextResponse.json({
      error: String(error),
      message: error.message,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : [],
    }, { status: 500 });
  }
}
