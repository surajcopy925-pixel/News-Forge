import { NextRequest, NextResponse } from 'next/server';
import { mosBridge } from '@/lib/mos-bridge';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ rundownId: string }> }
) {
  const { rundownId } = await params;
  const body = await req.json();
  const { action, dryRun } = body; // action: 'create' | 'replace' | 'delete', dryRun?: boolean

  // ── dryRun: inspect data without sending ──────────────
  if (dryRun) {
    const rundown = await prisma.rundown.findUnique({
      where: { rundownId },
      include: {
        entries: {
          include: { story: true, cgItems: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!rundown) {
      return NextResponse.json({ error: `Rundown ${rundownId} not found` }, { status: 404 });
    }
    return NextResponse.json({
      dryRun: true,
      rundownId: rundown.rundownId,
      title: (rundown as any).title,
      entryCount: rundown.entries.length,
      entries: rundown.entries.map((entry: any) => ({
        id: entry.id,
        storyId: entry.storyId,
        title: entry.story?.headline || entry.story?.slug || entry.storyId,
        orderIndex: entry.orderIndex,
        cgItemCount: entry.cgItems?.length || 0,
        cgItems: (entry.cgItems || []).map((cg: any) => ({
          cgItemId: cg.cgItemId,
          templateName: cg.templateName,
          dataElementName: cg.dataElementName,
          mosObjId: cg.mosObjId,
          hasMosXml: !!cg.mosObjXml,
          status: cg.status,
          channel: cg.channel,
        })),
      })),
    });
  }

  // ── Validate connection ────────────────────────────────
  if (!mosBridge.status.connected) {
    return NextResponse.json(
      {
        error: 'MOS bridge not connected. POST /api/mos {action:"connect"} first.',
        status: mosBridge.status,
      },
      { status: 503 }
    );
  }

  if (!['create', 'replace', 'delete'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be "create", "replace", or "delete"' },
      { status: 400 }
    );
  }

  // ── Handle delete (no DB query needed) ─────────────────
  if (action === 'delete') {
    const sent = mosBridge.sendMessage(mosBridge.buildRoDelete(rundownId));
    return NextResponse.json({
      success: sent,
      action: 'delete',
      roId: rundownId,
      status: mosBridge.status,
    });
  }

  // ── Fetch rundown with entries + CG items ──────────────
  const rundown = await prisma.rundown.findUnique({
    where: { rundownId },
    include: {
      entries: {
        include: {
          story: true,
          cgItems: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!rundown) {
    return NextResponse.json(
      { error: `Rundown ${rundownId} not found` },
      { status: 404 }
    );
  }

  // ── Build MOS Running Order ────────────────────────────
  const stories = (rundown.entries as any[])
    .filter((entry) => entry.cgItems && entry.cgItems.length > 0)
    .map((entry) => ({
      storyId: entry.storyId,
      storySlug: entry.story?.slug || entry.story?.headline || entry.storyId,
      items: (entry.cgItems as any[]).map((cg) => ({
        mosObjId: cg.mosObjId || `NEWSFORGE-${cg.cgItemId}`,
        mosObjXml: cg.mosObjXml || '',
        templateName: cg.templateName || '',
        channel: cg.channel || 'GFX',
        layer: cg.layer || 'FULL',
        orderIndex: cg.orderIndex || 0,
      })),
    }));

  if (stories.length === 0) {
    return NextResponse.json(
      { error: 'No stories with CG items in this rundown' },
      { status: 400 }
    );
  }

  const roData = {
    roId: rundown.rundownId,
    roSlug: (rundown as any).title || rundown.rundownId,
    stories,
  };

  // ── Build and send MOS message ─────────────────────────
  const message =
    action === 'create'
      ? mosBridge.buildRoCreate(roData)
      : mosBridge.buildRoReplace(roData);

  const sent = mosBridge.sendMessage(message);

  // ── Update CG statuses to READY ───────────────────────
  if (sent) {
    const allCgIds = (rundown.entries as any[])
      .flatMap((e) => e.cgItems || [])
      .map((cg: any) => cg.cgItemId);

    if (allCgIds.length > 0) {
      await prisma.cgItem.updateMany({
        where: { cgItemId: { in: allCgIds }, status: 'DRAFT' },
        data: { status: 'READY' },
      });
    }
  }

  const totalCgs = stories.reduce((sum, s) => sum + s.items.length, 0);

  return NextResponse.json({
    success: sent,
    action,
    roId: rundown.rundownId,
    roSlug: (rundown as any).title,
    storiesWithCg: stories.length,
    totalCgItems: totalCgs,
    cgStatuses: sent ? 'Updated DRAFT → READY' : 'Not updated (send failed)',
    status: mosBridge.status,
  });
}
