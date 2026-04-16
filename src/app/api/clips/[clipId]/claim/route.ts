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

// POST /api/clips/:clipId/claim
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { clipId } = await params;
    const userId = await getCurrentUserId();

    const clip = await prisma.storyClip.findUnique({ where: { clipId } });
    if (!clip) return notFoundResponse('Clip', clipId);

    // ONLY PENDING clips can be claimed
    if (clip.status !== 'PENDING') {
      return conflictResponse(
        `Clip cannot be claimed. Current status: ${clip.status}. Must be PENDING.`
      );
    }

    const updated = await prisma.storyClip.update({
      where: { clipId },
      data: {
        status: 'EDITING',
        claimedBy: userId,
        claimedAt: new Date(),
      },
    });

    await createAuditLog({
      userId,
      action: 'CLAIM',
      entity: 'CLIP',
      entityId: clipId,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'EDITING', claimedBy: userId },
    });

    emitClipEvent('updated', clipId, { storyId: updated.storyId });

    return successResponse(toFrontendClip(updated));
  } catch (e: any) {
    console.error('POST /api/clips/[id]/claim error:', e);
    return errorResponse(e.message, 500);
  }
}
