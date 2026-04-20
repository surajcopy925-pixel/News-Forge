// src/app/api/prompter/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import prompterClient from '@/lib/prompter-client';

export async function POST(req: NextRequest) {
  try {
    const { rundownId } = await req.json();

    if (!rundownId) {
      return NextResponse.json(
        { success: false, error: 'rundownId required' },
        { status: 400 }
      );
    }

    if (!prompterClient.isConnected()) {
      return NextResponse.json(
        { success: false, error: 'Not connected to prompter. Click 📜 Prompter button first.' },
        { status: 400 }
      );
    }

    // Get rundown with entries and stories in order
    const rundown = await prisma.rundown.findUnique({
      where: { rundownId },
      include: {
        entries: {
          orderBy: { orderIndex: 'asc' },
          include: {
            story: true,
          },
        },
      },
    });

    if (!rundown) {
      return NextResponse.json(
        { success: false, error: 'Rundown not found' },
        { status: 404 }
      );
    }

    if (rundown.entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No stories found in this rundown' },
        { status: 404 }
      );
    }

    // Build title
    const title = rundown.broadcastTime
      ? `${rundown.broadcastTime} Bulletin`
      : rundown.date
        ? `${rundown.date} Rundown`
        : `Rundown ${rundown.rundownId.substring(0, 8)}`;

    // Build story list with scripts in run order
    const storyList = rundown.entries.map((entry: any, index: number) => {
      const story = entry.story;
      
      // Favored order for prompter text
      const script = story? (
           story.anchorScript 
        || story.polishedScript 
        || story.rawScript 
        || story.content 
        || ''
      ) : '';

      return {
        storyId: story?.storyId || entry.entryId,
        orderIndex: entry.orderIndex,
        title: story?.title || entry.slug || `Story ${index + 1}`,
        script,
      };
    });

    // Count stories with actual script text
    const withScript = storyList.filter(s => s.script.length > 0).length;

    console.log(`[prompter/send] Sending "${title}": ${storyList.length} stories (${withScript} with script)`);

    // Send to prompter
    const result = await prompterClient.sendRundown(
      rundown.rundownId,
      title,
      storyList.map(s => ({
        storyId: s.storyId,
        storySlug: s.title,
        scriptText: s.script
      }))
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      rundownTitle: title,
      totalStories: storyList.length,
      storiesWithScript: withScript,
      storiesEmpty: storyList.length - withScript,
      storyTitles: storyList.map(s => ({
        title: s.title,
        hasScript: s.script.length > 0,
        scriptLength: s.script.length,
      })),
    });
  } catch (error) {
    console.error('[prompter/send] ERROR:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
