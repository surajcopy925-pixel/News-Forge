import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-helpers';
import { getCurrentUserId } from '@/lib/get-current-user';
import { emitCgEvent } from '@/lib/api-events';

export async function PATCH(req: NextRequest) {
  try {
    const { storyId, cgItemIds } = await req.json();
    const userId = await getCurrentUserId();

    if (!storyId || !Array.isArray(cgItemIds)) {
      return errorResponse('storyId and cgItemIds array are required');
    }

    // Bulk update orderIndex
    await prisma.$transaction(
      cgItemIds.map((id, index) =>
        prisma.cgItem.update({
          where: { cgItemId: id },
          data: { orderIndex: index },
        })
      )
    );

    emitCgEvent('reordered', storyId, { storyId, cgItemIds }, userId);

    return successResponse({ success: true, count: cgItemIds.length });
  } catch (e: any) {
    console.error('PATCH /api/cg-items/reorder error:', e);
    return errorResponse(e.message, 500);
  }
}
