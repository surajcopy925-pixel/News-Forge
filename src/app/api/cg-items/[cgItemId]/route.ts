import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toCgItemFrontend } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createAuditLog,
} from '@/lib/api-helpers';
import { getCurrentUserId } from '@/lib/get-current-user';
import { emitCgEvent } from '@/lib/api-events';

type Params = { params: Promise<{ cgItemId: string }> };

// GET /api/cg-items/:cgItemId
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { cgItemId } = await params;
    const cgItem = await prisma.cgItem.findUnique({ where: { cgItemId } });
    if (!cgItem) return notFoundResponse('CG Item', cgItemId);
    return successResponse(toCgItemFrontend(cgItem));
  } catch (e: any) {
    console.error('GET /api/cg-items/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// PATCH /api/cg-items/:cgItemId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { cgItemId } = await params;
    const body = await req.json();
    const userId = await getCurrentUserId();

    const existing = await prisma.cgItem.findUnique({ where: { cgItemId } });
    if (!existing) return notFoundResponse('CG Item', cgItemId);

    const data: any = {};
    if (body.templateName !== undefined) data.templateName = body.templateName;
    if (body.concept !== undefined) data.concept = body.concept;
    if (body.variant !== undefined) data.variant = body.variant;
    if (body.fieldData !== undefined) data.fieldData = body.fieldData;
    if (body.channel !== undefined) data.channel = body.channel;
    if (body.layer !== undefined) data.layer = body.layer;
    if (body.status !== undefined) data.status = body.status;
    if (body.entryId !== undefined) data.entryId = body.entryId;
    if (body.dataElementName !== undefined) data.dataElementName = body.dataElementName;
    if (body.dataElementId !== undefined) data.dataElementId = body.dataElementId;
    if (body.mosObjId !== undefined) data.mosObjId = body.mosObjId;
    if (body.mosObjXml !== undefined) data.mosObjXml = body.mosObjXml;

    data.updatedBy = userId;

    const cgItem = await prisma.cgItem.update({
      where: { cgItemId },
      data,
    });

    await createAuditLog({
      userId,
      action: 'UPDATE',
      entity: 'CG_ITEM',
      entityId: cgItemId,
      oldValue: existing,
      newValue: data,
    });

    emitCgEvent('updated', cgItemId, { storyId: cgItem.storyId, entryId: cgItem.entryId });

    return successResponse(toCgItemFrontend(cgItem));
  } catch (e: any) {
    console.error('PATCH /api/cg-items/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// DELETE /api/cg-items/:cgItemId
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { cgItemId } = await params;
    const userId = await getCurrentUserId();

    const existing = await prisma.cgItem.findUnique({ where: { cgItemId } });
    if (!existing) return notFoundResponse('CG Item', cgItemId);

    await prisma.cgItem.delete({ where: { cgItemId } });

    await createAuditLog({
      userId,
      action: 'DELETE',
      entity: 'CG_ITEM',
      entityId: cgItemId,
      oldValue: existing,
    });

    emitCgEvent('deleted', cgItemId, { storyId: existing.storyId, entryId: existing.entryId });

    return successResponse({ deleted: true, cgItemId });
  } catch (e: any) {
    console.error('DELETE /api/cg-items/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}
