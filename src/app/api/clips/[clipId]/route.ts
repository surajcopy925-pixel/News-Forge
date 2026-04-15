import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendClip } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createAuditLog,
} from '@/lib/api-helpers';

type Params = { params: Promise<{ clipId: string }> };

// GET /api/clips/:clipId
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { clipId } = await params;
    const clip = await prisma.storyClip.findUnique({ where: { clipId } });
    if (!clip) return notFoundResponse('Clip', clipId);
    return successResponse(toFrontendClip(clip));
  } catch (e: any) {
    console.error('GET /api/clips/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// PATCH /api/clips/:clipId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { clipId } = await params;
    const body = await req.json();

    const existing = await prisma.storyClip.findUnique({ where: { clipId } });
    if (!existing) return notFoundResponse('Clip', clipId);

    const data: any = {};
    if (body.fileName !== undefined) data.fileName = body.fileName;
    if (body.displayLabel !== undefined) data.displayLabel = body.displayLabel;
    if (body.duration !== undefined) data.duration = body.duration;
    if (body.status !== undefined) data.status = body.status;
    if (body.fileUrl !== undefined) data.fileUrl = body.fileUrl;
    if (body.editingInstructions !== undefined) data.editingInstructions = body.editingInstructions;
    if (body.editorialNotes !== undefined) data.editorialNotes = body.editorialNotes;

    const clip = await prisma.storyClip.update({ where: { clipId }, data });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'CLIP',
      entityId: clipId,
      oldValue: { status: existing.status },
      newValue: data,
    });

    return successResponse(toFrontendClip(clip));
  } catch (e: any) {
    console.error('PATCH /api/clips/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// DELETE /api/clips/:clipId
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { clipId } = await params;
    const existing = await prisma.storyClip.findUnique({ where: { clipId } });
    if (!existing) return notFoundResponse('Clip', clipId);

    await prisma.storyClip.delete({ where: { clipId } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'CLIP',
      entityId: clipId,
      oldValue: { fileName: existing.fileName, storyId: existing.storyId },
    });

    return successResponse({ deleted: true, clipId });
  } catch (e: any) {
    console.error('DELETE /api/clips/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}
