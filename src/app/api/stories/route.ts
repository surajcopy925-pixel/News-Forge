import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendStory } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  createAuditLog,
  generateStoryId,
  generateSlug,
} from '@/lib/api-helpers';

// GET /api/stories — List stories
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const format = searchParams.get('format');
    const createdBy = searchParams.get('createdBy');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = {};

    if (status) where.status = status;
    if (format) where.format = format;
    if (createdBy) where.createdBy = createdBy;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const stories = await prisma.story.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(stories.map(toFrontendStory));
  } catch (e: any) {
    console.error('GET /api/stories error:', e);
    return errorResponse(e.message, 500);
  }
}

// POST /api/stories — Create story
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      format,
      content,
      createdBy,
      category,
      location,
      source,
      language,
      priority,
      status,
      editorialNotes,
      plannedDuration,
    } = body;

    if (!title) return errorResponse('Title is required');
    if (!createdBy) return errorResponse('createdBy is required');

    const storyId = generateStoryId(language);
    const slug = generateSlug(title);

    const story = await prisma.story.create({
      data: {
        storyId,
        title,
        slug,
        format: format || 'EMPTY',
        status: status || 'DRAFT',
        content: content || '',
        rawScript: content || '',
        editorialNotes: editorialNotes || '',
        plannedDuration: plannedDuration || '00:00:00',
        createdBy,
        category: category || null,
        location: location || null,
        source: source || null,
        language: language || 'en',
        priority: priority || 'NORMAL',
      },
    });

    await createAuditLog({
      userId: createdBy,
      action: 'CREATE',
      entity: 'STORY',
      entityId: storyId,
      newValue: { title, format, status: story.status },
    });

    return successResponse(toFrontendStory(story), 201);
  } catch (e: any) {
    console.error('POST /api/stories error:', e);
    return errorResponse(e.message, 500);
  }
}
