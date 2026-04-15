import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, generateId } from '@/lib/api-helpers';
import { toFrontendStory } from '@/lib/db-helpers';

/**
 * GET /api/stories
 * List all stories
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const author = searchParams.get('author');

    const stories = await prisma.story.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(author ? { createdBy: author } : {}),
      },
      include: {
        creator: true,
        clips: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(stories.map(toFrontendStory));
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

/**
 * POST /api/stories
 * Create a new story
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, createdBy, format, category, status } = body;

    if (!title || !createdBy) {
      return errorResponse('Title and createdBy are required', 400);
    }

    const storyId = generateId('STY');

    const story = await prisma.story.create({
      data: {
        storyId,
        title,
        createdBy,
        format: format || 'VO',
        category: category || 'General',
        status: status || 'DRAFT',
        slug: title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''),
        language: 'en',
        priority: 'NORMAL',
      },
      include: {
        creator: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE',
        entity: 'STORY',
        entityId: storyId,
        metadata: { title },
      },
    });

    return successResponse(toFrontendStory(story), 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
