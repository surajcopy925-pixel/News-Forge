import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendRundown } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createAuditLog,
} from '@/lib/api-helpers';
import { emitRundownEvent } from '@/lib/api-events';

type Params = { params: Promise<{ rundownId: string }> };

// GET /api/rundowns/:rundownId
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { rundownId } = await params;
    const rundown = await prisma.rundown.findUnique({ where: { rundownId } });
    if (!rundown) return notFoundResponse('Rundown', rundownId);
    return successResponse(toFrontendRundown(rundown));
  } catch (e: any) {
    console.error('GET /api/rundowns/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// PATCH /api/rundowns/:rundownId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { rundownId } = await params;
    const body = await req.json();

    const existing = await prisma.rundown.findUnique({ where: { rundownId } });
    if (!existing) return notFoundResponse('Rundown', rundownId);

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.status !== undefined) data.status = body.status;
    if (body.plannedDuration !== undefined) data.plannedDuration = body.plannedDuration;
    if (body.mosStatus !== undefined) data.mosStatus = body.mosStatus;

    const rundown = await prisma.rundown.update({ where: { rundownId }, data });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'RUNDOWN',
      entityId: rundownId,
      oldValue: { status: existing.status },
      newValue: data,
    });

    emitRundownEvent('updated', rundownId);

    return successResponse(toFrontendRundown(rundown));
  } catch (e: any) {
    console.error('PATCH /api/rundowns/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// DELETE /api/rundowns/:rundownId
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { rundownId } = await params;
    const existing = await prisma.rundown.findUnique({ where: { rundownId } });
    if (!existing) return notFoundResponse('Rundown', rundownId);

    await prisma.rundown.delete({ where: { rundownId } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'RUNDOWN',
      entityId: rundownId,
      oldValue: { title: existing.title },
    });

    emitRundownEvent('deleted', rundownId);

    return successResponse({ deleted: true, rundownId });
  } catch (e: any) {
    console.error('DELETE /api/rundowns/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}
