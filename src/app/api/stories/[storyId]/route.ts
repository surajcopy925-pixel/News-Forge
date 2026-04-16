import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendStory, toPrismaFormat, toPrismaStatus } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  createAuditLog,
} from '@/lib/api-helpers';
import { getCurrentUserId } from '@/lib/get-current-user';
import { emitStoryEvent } from '@/lib/api-events';

type Params = { params: Promise<{ storyId: string }> };

// GET /api/stories/:storyId
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { storyId } = await params;
    const story = await prisma.story.findUnique({ where: { storyId } });
    if (!story) return notFoundResponse('Story', storyId);
    return successResponse(toFrontendStory(story));
  } catch (e: any) {
    console.error('GET /api/stories/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// PATCH /api/stories/:storyId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { storyId } = await params;
    const body = await req.json();
    const userId = await getCurrentUserId();

    const existing = await prisma.story.findUnique({ where: { storyId } });
    if (!existing) return notFoundResponse('Story', storyId);

    const data: any = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.format !== undefined) data.format = toPrismaFormat(body.format);
    if (body.status !== undefined) data.status = toPrismaStatus(body.status);
    if (body.content !== undefined) {
      data.content = body.content;
      data.rawScript = body.content;
    }
    if (body.rawScript !== undefined) data.rawScript = body.rawScript;
    if (body.polishedScript !== undefined) data.polishedScript = body.polishedScript;
    if (body.anchorScript !== undefined) data.anchorScript = body.anchorScript;
    if (body.voiceoverScript !== undefined) data.voiceoverScript = body.voiceoverScript;
    if (body.editorialNotes !== undefined) data.editorialNotes = body.editorialNotes;
    if (body.plannedDuration !== undefined) data.plannedDuration = body.plannedDuration;
    if (body.category !== undefined) data.category = body.category;
    if (body.location !== undefined) data.location = body.location;
    if (body.source !== undefined) data.source = body.source;
    if (body.language !== undefined) data.language = body.language;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.rundownId !== undefined) data.rundownId = body.rundownId;
    if (body.orderIndex !== undefined) data.orderIndex = body.orderIndex;

    if (body.polishedScript !== undefined) {
      data.isPolished = true;
      data.polishedAt = new Date();
      data.polishedBy = userId;
    }

    const story = await prisma.story.update({ where: { storyId }, data });

    await createAuditLog({
      userId,
      action: 'UPDATE',
      entity: 'STORY',
      entityId: storyId,
      oldValue: { status: existing.status, format: existing.format },
      newValue: data,
    });

    emitStoryEvent('updated', storyId);

    return successResponse(toFrontendStory(story));
  } catch (e: any) {
    console.error('PATCH /api/stories/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}

// DELETE /api/stories/:storyId
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { storyId } = await params;
    const existing = await prisma.story.findUnique({ where: { storyId } });
    if (!existing) return notFoundResponse('Story', storyId);
    
    const userId = await getCurrentUserId();
    await prisma.story.delete({ where: { storyId } });

    await createAuditLog({
      userId,
      action: 'DELETE',
      entity: 'STORY',
      entityId: storyId,
      oldValue: { title: existing.title },
    });

    emitStoryEvent('deleted', storyId);

    return successResponse({ deleted: true, storyId });
  } catch (e: any) {
    console.error('DELETE /api/stories/[id] error:', e);
    return errorResponse(e.message, 500);
  }
}
