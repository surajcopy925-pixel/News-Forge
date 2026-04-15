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

// POST /api/clips/:clipId/send-to-editor-hub
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { clipId } = await params;
    const body = await req.json();
    const { editingInstructions, editorialNotes } = body;

    const clip = await prisma.storyClip.findUnique({ where: { clipId } });
    if (!clip) return notFoundResponse('Clip', clipId);

    const data: any = {};
    if (editingInstructions !== undefined) data.editingInstructions = editingInstructions;
    if (editorialNotes !== undefined) data.editorialNotes = editorialNotes;

    const updated = await prisma.storyClip.update({ where: { clipId }, data });

    await createAuditLog({
      action: 'SEND_TO_EDITOR_HUB',
      entity: 'CLIP',
      entityId: clipId,
      newValue: data,
    });

    return successResponse(toFrontendClip(updated));
  } catch (e: any) {
    console.error('POST /api/clips/[id]/send-to-editor-hub error:', e);
    return errorResponse(e.message, 500);
  }
}
