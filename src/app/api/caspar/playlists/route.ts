import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('[playlists] Fetching...');

    // Step 1: Try to get rundowns with stories included
    let rundowns: any[] = [];
    let useInclude = false;

    try {
      rundowns = await prisma.rundown.findMany({
        orderBy: { createdAt: 'desc' },
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
      useInclude = true;
      console.log(`[playlists] Got rundowns with entries include`);
    } catch (includeErr) {
      console.log(`[playlists] Include failed, trying without: ${includeErr}`);
      rundowns = await prisma.rundown.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    // Step 2: If include worked, build from included data
    if (useInclude) {
      const playlists = rundowns.map((rundown: any) => {
        const rdId = rundown.rundownId;
        const entries = rundown.entries || [];
        const stories = entries.map((en: any) => en.story).filter(Boolean);

        const clips = stories
          .filter((story: any) => story.clips && story.clips.length > 0)
          .map((story: any, index: number) => {
            // Find first clip with a fileName
            const clip = story.clips.find((c: any) => c.fileName && c.fileName.length > 0) || story.clips[0];
            if (!clip || !clip.fileName) return null;

            const fileName = clip.fileName;
            const playoutName = fileName.replace(/\.[^.]+$/, '');

            return {
              id: clip.clipId || clip.id || `clip-${index}`,
              storyId: story.storyId || story.id,
              storyTitle: story.title || story.displayLabel || story.slug || `Story ${index + 1}`,
              fileName,
              playoutName,
              orderIndex: index,
              hasVideo: true,
            };
          })
          .filter(Boolean);

        const title = rundown.broadcastTime
          ? `${rundown.broadcastTime} Bulletin`
          : rundown.date
            ? `${rundown.date} Rundown`
            : `Rundown ${rdId?.substring(0, 8) || ''}`;

        return {
          id: rdId,
          title,
          status: rundown.mosStatus || 'UNKNOWN',
          updatedAt: rundown.createdAt,
          clipCount: clips.length,
          storyCount: stories.length,
          clips,
        };
      });

      // Sort: with clips first
      playlists.sort((a: any, b: any) => b.clipCount - a.clipCount);

      return NextResponse.json({
        success: true,
        playlists,
        totalRundowns: rundowns.length,
      });
    }

    // Step 3: Fallback — get stories separately and map by rundownId
    const allStories = await prisma.story.findMany({
      include: {
        clips: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Group by rundownId
    const storyByRundown: Record<string, any[]> = {};
    const unassigned: any[] = [];

    for (const story of allStories) {
      const s = story as any;
      const rdId = s.rundownId;
      if (rdId) {
        if (!storyByRundown[rdId]) storyByRundown[rdId] = [];
        storyByRundown[rdId].push(s);
      } else {
        unassigned.push(s);
      }
    }

    const playlists = rundowns.map((rundown: any) => {
      const rdId = rundown.rundownId;
      const stories = storyByRundown[rdId] || [];

      const clips = stories
        .filter((story: any) => story.clips?.some((c: any) => c.fileName))
        .map((story: any, index: number) => {
          const clip = story.clips.find((c: any) => c.fileName) || story.clips[0];
          if (!clip?.fileName) return null;
          const fileName = clip.fileName;
          const playoutName = fileName.replace(/\.[^.]+$/, '');

          return {
            id: clip.clipId || clip.id,
            storyId: story.storyId || story.id,
            storyTitle: story.title || story.displayLabel || `Story ${index + 1}`,
            fileName,
            playoutName,
            orderIndex: index,
            hasVideo: true,
          };
        })
        .filter(Boolean);

      const title = rundown.broadcastTime
        ? `${rundown.broadcastTime} Bulletin`
        : rundown.date
          ? `${rundown.date} Rundown`
          : `Rundown ${rdId?.substring(0, 8) || ''}`;

      return {
        id: rdId,
        title,
        status: rundown.mosStatus || 'UNKNOWN',
        updatedAt: rundown.createdAt,
        clipCount: clips.length,
        storyCount: stories.length,
        clips,
      };
    });

    // Add unassigned
    const unassignedWithClips = unassigned.filter(
      (s: any) => s.clips?.some((c: any) => c.fileName)
    );
    if (unassignedWithClips.length > 0) {
      const uClips = unassignedWithClips.map((story: any, index: number) => {
        const clip = story.clips.find((c: any) => c.fileName) || story.clips[0];
        const fileName = clip.fileName;
        const playoutName = fileName.replace(/\.[^.]+$/, '');
        return {
          id: clip.clipId || clip.id,
          storyId: (story as any).storyId || (story as any).id,
          storyTitle: (story as any).title || (story as any).displayLabel || `Clip ${index + 1}`,
          fileName,
          playoutName,
          orderIndex: index,
          hasVideo: true,
        };
      });

      playlists.push({
        id: 'UNASSIGNED',
        title: '📁 Unassigned Clips',
        status: 'READY',
        updatedAt: new Date().toISOString(),
        clipCount: uClips.length,
        storyCount: unassignedWithClips.length,
        clips: uClips,
      });
    }

    playlists.sort((a: any, b: any) => b.clipCount - a.clipCount);

    return NextResponse.json({
      success: true,
      playlists,
      totalRundowns: rundowns.length,
    });
  } catch (error) {
    console.error('[playlists] ERROR:', error);
    return NextResponse.json(
      { success: false, error: String(error), playlists: [], totalRundowns: 0 },
      { status: 500 }
    );
  }
}
