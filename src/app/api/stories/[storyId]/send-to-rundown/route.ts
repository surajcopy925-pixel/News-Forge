import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendEntry } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createAuditLog,
  generateEntryId,
} from '@/lib/api-helpers';
import { getCurrentUserId } from '@/lib/get-current-user';
import { emitStoryEvent } from '@/lib/api-events';

type Params = { params: Promise<{ storyId: string }> };

// POST /api/stories/:storyId/send-to-rundown
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { storyId } = await params;
    const body = await req.json();
    const userId = await getCurrentUserId();
    const { rundownId } = body;

    if (!rundownId) return errorResponse('rundownId is required');

    const story = await prisma.story.findUnique({ where: { storyId } });
    if (!story) return notFoundResponse('Story', storyId);

    const rundown = await prisma.rundown.findUnique({ where: { rundownId } });
    if (!rundown) return notFoundResponse('Rundown', rundownId);

    const scriptContent = story.polishedScript || story.rawScript || story.content;
    const scriptSource = story.isPolished ? 'POLISHED' : 'RAW';

    const lastEntry = await prisma.rundownEntry.findFirst({
      where: { rundownId },
      orderBy: { orderIndex: 'desc' },
    });
    const nextIndex = (lastEntry?.orderIndex ?? -1) + 1;

    // Check if already in rundown — update instead of duplicate
    const existingEntry = await prisma.rundownEntry.findFirst({
      where: { rundownId, storyId },
    });

    let entry;
    if (existingEntry) {
      entry = await prisma.rundownEntry.update({
        where: { entryId: existingEntry.entryId },
        data: { scriptContent, scriptSource },
      });
    } else {
      entry = await prisma.rundownEntry.create({
        data: {
          entryId: generateEntryId(),
          rundownId,
          storyId,
          orderIndex: nextIndex,
          scriptContent,
          scriptSource,
        },
      });
    }

    await prisma.story.update({
      where: { storyId },
      data: {
        scriptSentToRundown: scriptContent,
        sentToRundownId: rundownId,
        sentToRundownAt: new Date(),
        sentBy: userId,
        anchorScript: story.anchorScript || scriptContent,
      },
    });

    await createAuditLog({
      userId,
      action: 'SEND_TO_RUNDOWN',
      entity: 'STORY',
      entityId: storyId,
      newValue: { rundownId, scriptSource },
    });

    emitStoryEvent('updated', storyId);

    return successResponse(toFrontendEntry(entry), 201);
  } catch (e: any) {
    console.error('POST /api/stories/[id]/send-to-rundown error:', e);
    return errorResponse(e.message, 500);
  }
}
