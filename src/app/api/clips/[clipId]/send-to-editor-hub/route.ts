import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendClip } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createAuditLog,
} from '@/lib/api-helpers';
import { getCurrentUserId } from '@/lib/get-current-user';
import { emitClipEvent } from '@/lib/api-events';

type Params = { params: Promise<{ clipId: string }> };

// POST /api/clips/:clipId/send-to-editor-hub
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { clipId } = await params;
    const body = await req.json();
    const userId = await getCurrentUserId();
    const { editingInstructions, editorialNotes } = body;

    const clip = await prisma.storyClip.findUnique({ where: { clipId } });
    if (!clip) return notFoundResponse('Clip', clipId);

    // ALWAYS save non-empty values so we can detect "sent" state
    const data = {
      editingInstructions: (editingInstructions && editingInstructions.trim())
        ? editingInstructions.trim()
        : '[Sent to Editor Hub — no specific instructions]',
      editorialNotes: (editorialNotes && editorialNotes.trim())
        ? editorialNotes.trim()
        : '',
    };

    const updated = await prisma.storyClip.update({
      where: { clipId },
      data,
    });

    await createAuditLog({
      userId,
      action: 'SEND_TO_EDITOR_HUB',
      entity: 'CLIP',
      entityId: clipId,
      newValue: data,
    });

    emitClipEvent('updated', clipId, { storyId: updated.storyId });

    return successResponse(toFrontendClip(updated));
  } catch (e: any) {
    console.error('POST /api/clips/[id]/send-to-editor-hub error:', e);
    return errorResponse(e.message, 500);
  }
}
