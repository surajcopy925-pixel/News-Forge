import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-helpers';
import { toFrontendStory } from '@/lib/db-helpers';

type Params = { id: string };

/**
 * GET /api/stories/[id]
 * Get a single story
 */
export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;
    const story = await prisma.story.findUnique({
      where: { storyId: id },
      include: {
        creator: true,
        clips: true,
        polishedByUser: true,
        sentByUser: true,
        rundown: true,
      },
    });

    if (!story) {
      return errorResponse('Story not found', 404);
    }

    return successResponse(toFrontendStory(story));
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

/**
 * PATCH /api/stories/[id]
 * Update a story
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Remove immutable fields
    delete body.storyId;
    delete body.id;
    delete body.createdAt;

    const story = await prisma.story.update({
      where: { storyId: id },
      data: body,
      include: {
        creator: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: body.updatedBy || 'SYSTEM',
        action: 'UPDATE',
        entity: 'STORY',
        entityId: id,
        metadata: { changes: Object.keys(body) },
      },
    });

    return successResponse(toFrontendStory(story));
  } catch (error: any) {
    if (error.code === 'P2025') {
      return errorResponse('Story not found', 404);
    }
    return errorResponse(error.message, 500);
  }
}

/**
 * DELETE /api/stories/[id]
 * Delete a story
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;

    // First delete associated clips to avoid FK constraint issues if cascade not set
    // In our schema they are set to cascade, but good to be explicit or simple
    await prisma.story.delete({
      where: { storyId: id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: 'SYSTEM', // Should ideally get from session/header
        action: 'DELETE',
        entity: 'STORY',
        entityId: id,
      },
    });

    return successResponse({ deleted: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return errorResponse('Story not found', 404);
    }
    return errorResponse(error.message, 500);
  }
}
