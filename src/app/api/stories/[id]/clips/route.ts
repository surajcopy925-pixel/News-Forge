import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-helpers';
import { toFrontendClip } from '@/lib/db-helpers';

type Params = { id: string };

/**
 * GET /api/stories/[id]/clips
 * Get all clips for a specific story
 */
export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;
    
    const clips = await prisma.storyClip.findMany({
      where: { storyId: id },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return successResponse(clips.map(toFrontendClip));
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
