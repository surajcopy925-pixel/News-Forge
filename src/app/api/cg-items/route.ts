import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toCgItemFrontend } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  generateCgItemId,
  createAuditLog,
} from '@/lib/api-helpers';
import { getCurrentUserId } from '@/lib/get-current-user';
import { emitCgEvent } from '@/lib/api-events';

// GET /api/cg-items?storyId=...&entryId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get('storyId');
    const entryId = searchParams.get('entryId');

    if (!storyId) return errorResponse('storyId is required');

    const cgItems = await prisma.cgItem.findMany({
      where: {
        storyId,
        ...(entryId ? { entryId } : {}),
      },
      orderBy: { orderIndex: 'asc' },
    });

    return successResponse(cgItems.map(toCgItemFrontend));
  } catch (e: any) {
    console.error('GET /api/cg-items error:', e);
    return errorResponse(e.message, 500);
  }
}

// POST /api/cg-items
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await getCurrentUserId();
    const {
      storyId,
      entryId,
      templateName,
      concept,
      variant,
      dataElementName,
      dataElementId,
      mosObjId,
      mosObjXml,
      fieldData,
      channel,
      layer,
    } = body;

    if (!storyId) return errorResponse('storyId is required');
    if (!templateName) return errorResponse('templateName is required');

    if (storyId.startsWith('SYS-')) {
      const existingStory = await prisma.story.findUnique({ where: { storyId } });
      if (!existingStory) {
        await prisma.story.create({
          data: {
            storyId,
            title: storyId.replace('SYS-', ''),
            slug: storyId.replace('SYS-', ''),
            format: 'EMPTY',
            status: 'READY',
            createdBy: userId,
          }
        });
      }
    }

    // Get next orderIndex
    const lastItem = await prisma.cgItem.findFirst({
      where: { storyId },
      orderBy: { orderIndex: 'desc' },
    });
    const nextIndex = (lastItem?.orderIndex ?? -1) + 1;

    const finalEntryId = (entryId && !entryId.startsWith('SYS-')) ? entryId : null;

    const cgItem = await prisma.cgItem.create({
      data: {
        cgItemId: generateCgItemId(),
        storyId,
        entryId: finalEntryId,
        templateName,
        concept: concept || 'Default',
        variant: variant || 'Default',
        dataElementName: dataElementName || null,
        dataElementId: dataElementId || null,
        mosObjId: mosObjId || null,
        mosObjXml: mosObjXml || null,
        fieldData: fieldData || {},
        channel: channel || 'GFX1',
        layer: layer || 'FULL',
        orderIndex: nextIndex,
        createdBy: userId,
        status: 'DRAFT',
      },
    });

    await createAuditLog({
      userId,
      action: 'CREATE',
      entity: 'CG_ITEM',
      entityId: cgItem.cgItemId,
      newValue: cgItem,
    });

    emitCgEvent('created', cgItem.cgItemId, { storyId, entryId });

    return successResponse(toCgItemFrontend(cgItem), 201);
  } catch (e: any) {
    console.error('POST /api/cg-items error:', e);
    return errorResponse(e.message, 500);
  }
}
