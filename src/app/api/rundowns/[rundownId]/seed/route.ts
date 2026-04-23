import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  generateEntryId,
  createAuditLog,
} from '@/lib/api-helpers';
import { getCurrentUserId } from '@/lib/get-current-user';
import { emitEntryEvent } from '@/lib/api-events';

type Params = { params: Promise<{ rundownId: string }> };

// POST /api/rundowns/:rundownId/seed
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { rundownId } = await params;
    const userId = await getCurrentUserId();

    const rundown = await prisma.rundown.findUnique({ where: { rundownId } });
    if (!rundown) return notFoundResponse('Rundown', rundownId);

    // ALWAYS SEED: Clear ALL existing entries for this rundown first
    console.log(`[API] Seeding: clearing ALL existing entries for rundown ${rundownId}`);
    await prisma.rundownEntry.deleteMany({
      where: { rundownId }
    });

    console.log(`[API] Seeding entries for rundown ${rundownId}`);

    const systemRows = [
      { id: 'HEADLINES', title: 'HEADLINES', format: 'ANCHOR', dur: '00:00:15' },
      { id: 'START', title: 'START', format: 'ANCHOR', dur: '00:00:15' },
      { id: 'BREAK1', title: 'BREAK 1', format: 'BREAK', dur: '00:05:00' },
      { id: 'BREAK2', title: 'BREAK 2', format: 'BREAK', dur: '00:05:00' },
      { id: 'END', title: 'END', format: 'ANCHOR', dur: '00:00:15' },
    ];

    const results = [];
    for (let i = 0; i < systemRows.length; i++) {
      const sys = systemRows[i];
      const sysStoryId = `SYS-${rundownId}-${sys.id}`;

      // Create or update the system story
      const story = await prisma.story.upsert({
        where: { storyId: sysStoryId },
        update: {
          title: sys.title,
          slug: sys.title,
          format: sys.format as any,
          status: 'READY',
          plannedDuration: sys.dur,
        },
        create: {
          storyId: sysStoryId,
          title: sys.title,
          slug: sys.title,
          format: sys.format as any,
          status: 'READY',
          plannedDuration: sys.dur,
          createdBy: userId || 'SYSTEM',
          content: '',
          language: 'en',
        },
      });

      // Create or update the rundown entry
      console.log(`[API] Upserting entry for story ${story.storyId} in rundown ${rundownId}`);
      const entry = await prisma.rundownEntry.upsert({
        where: {
          rundownId_storyId: {
            rundownId: rundownId,
            storyId: story.storyId,
          }
        },
        update: {
          orderIndex: i,
          scriptContent: '',
          scriptSource: 'RAW',
        },
        create: {
          entryId: generateEntryId(),
          rundownId: rundownId,
          storyId: story.storyId,
          orderIndex: i,
          scriptContent: '',
          scriptSource: 'RAW',
        },
      });
      results.push(entry);
    }

    console.log(`[API] Successfully seeded ${results.length} entries for rundown ${rundownId}`);
    console.log('[API] Inserted entries:', results.map(r => ({ entryId: r.entryId, storyId: r.storyId, rundownId: r.rundownId })));

    await createAuditLog({
      userId,
      action: 'SEED_RUNDOWN',
      entity: 'RUNDOWN',
      entityId: rundownId,
      newValue: { count: results.length },
    });

    // Notify clients to refresh
    emitEntryEvent('reordered', rundownId, { rundownId });

    return successResponse({ seeded: true, count: results.length });
  } catch (e: any) {
    console.error('POST /api/rundowns/[id]/seed error:', e);
    return errorResponse(e.message, 500);
  }
}
