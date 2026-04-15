import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendClip } from '@/lib/db-helpers';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-helpers';

type Params = { params: Promise<{ storyId: string }> };

// GET /api/stories/:storyId/clips
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { storyId } = await params;

    const story = await prisma.story.findUnique({ where: { storyId } });
    if (!story) return notFoundResponse('Story', storyId);

    const clips = await prisma.storyClip.findMany({
      where: { storyId },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(clips.map(toFrontendClip));
  } catch (e: any) {
    console.error('GET /api/stories/[id]/clips error:', e);
    return errorResponse(e.message, 500);
  }
}
