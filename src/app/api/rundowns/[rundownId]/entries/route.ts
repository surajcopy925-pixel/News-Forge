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

type Params = { params: Promise<{ rundownId: string }> };

// GET /api/rundowns/:rundownId/entries
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { rundownId } = await params;

    const rundown = await prisma.rundown.findUnique({ where: { rundownId } });
    if (!rundown) return notFoundResponse('Rundown', rundownId);

    const entries = await prisma.rundownEntry.findMany({
      where: { rundownId },
      orderBy: { orderIndex: 'asc' },
    });

    return successResponse(entries.map(toFrontendEntry));
  } catch (e: any) {
    console.error('GET /api/rundowns/[id]/entries error:', e);
    return errorResponse(e.message, 500);
  }
}

// POST /api/rundowns/:rundownId/entries — Add story to rundown
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { rundownId } = await params;
    const body = await req.json();
    const { storyId, userId } = body;

    if (!storyId) return errorResponse('storyId is required');

    const rundown = await prisma.rundown.findUnique({ where: { rundownId } });
    if (!rundown) return notFoundResponse('Rundown', rundownId);

    const story = await prisma.story.findUnique({ where: { storyId } });
    if (!story) return notFoundResponse('Story', storyId);

    const lastEntry = await prisma.rundownEntry.findFirst({
      where: { rundownId },
      orderBy: { orderIndex: 'desc' },
    });
    const nextIndex = (lastEntry?.orderIndex ?? -1) + 1;

    const scriptContent = story.polishedScript || story.rawScript || story.content;
    const scriptSource = story.isPolished ? 'POLISHED' : 'RAW';

    const entry = await prisma.rundownEntry.create({
      data: {
        entryId: generateEntryId(),
        rundownId,
        storyId,
        orderIndex: nextIndex,
        scriptContent,
        scriptSource,
      },
    });

    await createAuditLog({
      userId,
      action: 'ADD_ENTRY',
      entity: 'RUNDOWN_ENTRY',
      entityId: entry.entryId,
      newValue: { rundownId, storyId },
    });

    return successResponse(toFrontendEntry(entry), 201);
  } catch (e: any) {
    console.error('POST /api/rundowns/[id]/entries error:', e);
    return errorResponse(e.message, 500);
  }
}
