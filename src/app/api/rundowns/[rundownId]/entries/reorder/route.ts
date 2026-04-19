import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createAuditLog,
} from '@/lib/api-helpers';
import { emitEntryEvent } from '@/lib/api-events';
import { eventBus, EventType } from '@/lib/event-bus';

type Params = { params: Promise<{ rundownId: string }> };

// PATCH /api/rundowns/:rundownId/entries/reorder
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { rundownId } = await params;
    const body = await req.json();
    const { entryIds } = body;

    if (!Array.isArray(entryIds)) return errorResponse('entryIds must be an array');

    const rundown = await prisma.rundown.findUnique({ where: { rundownId } });
    if (!rundown) return notFoundResponse('Rundown', rundownId);

    await Promise.all(
      entryIds.map((entryId: string, index: number) =>
        prisma.rundownEntry.update({
          where: { entryId },
          data: { orderIndex: index },
        })
      )
    );

    await createAuditLog({
      action: 'REORDER',
      entity: 'RUNDOWN',
      entityId: rundownId,
      newValue: { entryIds },
    });

    emitEntryEvent('reordered', rundownId, { rundownId });

    // Emit reorder event for teleprompter sync
    try {
      // Get the new order of stories after reordering
      const reorderedEntries = await prisma.rundownEntry.findMany({
        where: { rundownId },
        orderBy: { orderIndex: 'asc' },
        select: { storyId: true, orderIndex: true },
      });

      eventBus.emit(EventType.RUNDOWN_REORDERED, {
        rundownId,
        storyOrder: reorderedEntries.map(e => e.storyId),
      });
    } catch (eventError) {
      console.error('[API] Failed to emit reorder event:', eventError);
    }

    return successResponse({ reordered: true, rundownId, count: entryIds.length });
  } catch (e: any) {
    console.error('PATCH /api/rundowns/[id]/entries/reorder error:', e);
    return errorResponse(e.message, 500);
  }
}
