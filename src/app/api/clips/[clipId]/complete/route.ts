import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendClip } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  conflictResponse,
  createAuditLog,
} from '@/lib/api-helpers';
import { getCurrentUserId } from '@/lib/get-current-user';
import { emitClipEvent } from '@/lib/api-events';

type Params = { params: Promise<{ clipId: string }> };

// POST /api/clips/:clipId/complete
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { clipId } = await params;
    const body = await req.json();
    const userId = await getCurrentUserId();
    const { displayLabel } = body;

    if (!displayLabel) return errorResponse('displayLabel is required');

    const clip = await prisma.storyClip.findUnique({ where: { clipId } });
    if (!clip) return notFoundResponse('Clip', clipId);

    // ONLY EDITING clips can be completed
    if (clip.status !== 'EDITING') {
      return conflictResponse(
        `Clip cannot be completed. Current status: ${clip.status}. Must be EDITING.`
      );
    }

    const updated = await prisma.storyClip.update({
      where: { clipId },
      data: {
        status: 'DONE',
        displayLabel,
        completedAt: new Date(),
      },
    });

    await createAuditLog({
      userId,
      action: 'COMPLETE',
      entity: 'CLIP',
      entityId: clipId,
      oldValue: { status: 'EDITING' },
      newValue: { status: 'DONE', displayLabel },
    });

    emitClipEvent('updated', clipId, { storyId: updated.storyId });

    return successResponse(toFrontendClip(updated));
  } catch (e: any) {
    console.error('POST /api/clips/[id]/complete error:', e);
    return errorResponse(e.message, 500);
  }
}
