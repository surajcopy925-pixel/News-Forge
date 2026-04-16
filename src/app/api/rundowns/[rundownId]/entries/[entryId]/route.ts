import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendEntry } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createAuditLog,
} from '@/lib/api-helpers';
import { emitEntryEvent } from '@/lib/api-events';

type Params = { params: Promise<{ rundownId: string; entryId: string }> };

// GET /api/rundowns/:rundownId/entries/:entryId
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { entryId } = await params;
    const entry = await prisma.rundownEntry.findUnique({ where: { entryId } });
    if (!entry) return notFoundResponse('Entry', entryId);
    return successResponse(toFrontendEntry(entry));
  } catch (e: any) {
    console.error('GET /api/rundowns/[id]/entries/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// PATCH /api/rundowns/:rundownId/entries/:entryId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { entryId } = await params;
    const body = await req.json();

    const existing = await prisma.rundownEntry.findUnique({ where: { entryId } });
    if (!existing) return notFoundResponse('Entry', entryId);

    const data: any = {};
    if (body.scriptContent !== undefined) data.scriptContent = body.scriptContent;
    if (body.scriptSource !== undefined) data.scriptSource = body.scriptSource;
    if (body.orderIndex !== undefined) data.orderIndex = body.orderIndex;

    const entry = await prisma.rundownEntry.update({ where: { entryId }, data });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'RUNDOWN_ENTRY',
      entityId: entryId,
      oldValue: { scriptSource: existing.scriptSource },
      newValue: data,
    });

    emitEntryEvent('updated', entryId, { rundownId: entry.rundownId });

    return successResponse(toFrontendEntry(entry));
  } catch (e: any) {
    console.error('PATCH /api/rundowns/[id]/entries/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// DELETE /api/rundowns/:rundownId/entries/:entryId
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { rundownId, entryId } = await params;

    const existing = await prisma.rundownEntry.findUnique({ where: { entryId } });
    if (!existing) return notFoundResponse('Entry', entryId);

    await prisma.rundownEntry.delete({ where: { entryId } });

    // Re-index remaining entries
    const remaining = await prisma.rundownEntry.findMany({
      where: { rundownId },
      orderBy: { orderIndex: 'asc' },
    });

    await Promise.all(
      remaining.map((e, index) =>
        prisma.rundownEntry.update({
          where: { entryId: e.entryId },
          data: { orderIndex: index },
        })
      )
    );

    await createAuditLog({
      action: 'DELETE',
      entity: 'RUNDOWN_ENTRY',
      entityId: entryId,
      oldValue: { rundownId, storyId: existing.storyId },
    });

    emitEntryEvent('deleted', entryId, { rundownId });

    return successResponse({ deleted: true, entryId });
  } catch (e: any) {
    console.error('DELETE /api/rundowns/[id]/entries/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}
