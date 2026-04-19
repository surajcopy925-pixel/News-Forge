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

    // Get rundown with stories in order
    let rundown: any = null;

    try {
      rundown = await prisma.rundown.findUnique({
        where: { rundownId },
        include: {
          stories: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    } catch {
      // If include fails, try getting stories separately
      rundown = await prisma.rundown.findUnique({
        where: { rundownId },
      });
    }

    if (!rundown) {
      return NextResponse.json(
        { success: false, error: 'Rundown not found' },
        { status: 404 }
      );
    }

    // Get stories — either from include or separate query
    let stories: any[] = (rundown as any).stories || [];

    if (stories.length === 0) {
      // Try getting stories by rundownId field
      try {
        stories = await prisma.story.findMany({
          where: { rundownId } as any,
          orderBy: { createdAt: 'asc' },
        });
      } catch {}
    }

    if (stories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No stories found in this rundown' },
        { status: 404 }
      );
    }

    // Build title
    const rd = rundown as any;
    const title = rd.broadcastTime
      ? `${rd.broadcastTime} Bulletin`
      : rd.date
        ? `${rd.date} Rundown`
        : `Rundown ${rd.rundownId.substring(0, 8)}`;

    // Build story list with scripts in run order
    const storyList = stories.map((story: any, index: number) => {
      // Try multiple possible field names for script content
      const script = story.script
        || story.body
        || story.prompterText
        || story.content
        || story.text
        || story.scriptText
        || '';

      return {
        storyId: story.storyId || story.id || `story-${index}`,
        orderIndex: story.orderIndex ?? index,
        title: story.title || story.displayLabel || story.slug || `Story ${index + 1}`,
        script,
      };
    });

    // Count stories with actual script text
    const withScript = storyList.filter(s => s.script.length > 0).length;

    console.log(`[prompter/send] Sending "${title}": ${storyList.length} stories (${withScript} with script)`);

    // Send to prompter
    const result = prompterClient.sendRundown({
      rundownId: rd.rundownId,
      title,
      stories: storyList,
    });

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
