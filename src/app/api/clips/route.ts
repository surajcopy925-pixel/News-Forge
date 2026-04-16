import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendClip } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  createAuditLog,
  generateClipId,
  generateClipFileName,
} from '@/lib/api-helpers';
import { emitClipEvent } from '@/lib/api-events';

// GET /api/clips — List clips
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get('storyId');
    const status = searchParams.get('status');
    const claimedBy = searchParams.get('claimedBy');
    const search = searchParams.get('search');

    const where: any = {};

    if (storyId) where.storyId = storyId;
    if (status) where.status = status;
    if (claimedBy) where.claimedBy = claimedBy;
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { originalFileName: { contains: search, mode: 'insensitive' } },
        { displayLabel: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clips = await prisma.storyClip.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(clips.map(toFrontendClip));
  } catch (e: any) {
    console.error('GET /api/clips error:', e);
    return errorResponse(e.message, 500);
  }
}

// POST /api/clips — Create clip
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storyId, originalFileName, fileType, duration } = body;

    if (!storyId) return errorResponse('storyId is required');
    if (!originalFileName) return errorResponse('originalFileName is required');

    // Verify story exists
    const story = await prisma.story.findUnique({ where: { storyId } });
    if (!story) return errorResponse(`Story not found: ${storyId}`, 404);

    // Count existing clips for this story
    const clipCount = await prisma.storyClip.count({ where: { storyId } });
    const clipIndex = clipCount + 1;

    const clipId = generateClipId(storyId, clipIndex);
    const fileName = generateClipFileName(clipId);

    const clip = await prisma.storyClip.create({
      data: {
        clipId,
        storyId,
        fileName: body.fileName || fileName, // Allow passing fileName from upload
        originalFileName,
        fileUrl: body.fileUrl || '',
        fileSize: body.fileSize || null,
        fileType: body.fileType || 'video/mp4',
        duration: duration || null,
        codec: body.codec || null,
        resolution: body.resolution || null,
        fps: body.fps || null,
        proxyUrl: body.proxyUrl || null,
        thumbnailUrl: body.thumbnailUrl || null,
        status: 'PENDING',
      },
    });


    await createAuditLog({
      action: 'CREATE',
      entity: 'CLIP',
      entityId: clipId,
      newValue: { storyId, originalFileName, fileName },
    });

    emitClipEvent('created', clip.clipId, { storyId });

    return successResponse(toFrontendClip(clip), 201);
  } catch (e: any) {
    console.error('POST /api/clips error:', e);
    return errorResponse(e.message, 500);
  }
}
