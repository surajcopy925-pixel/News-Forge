import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendRundown } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  createAuditLog,
  generateRundownId,
} from '@/lib/api-helpers';

// GET /api/rundowns — List rundowns
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const where: any = {};
    if (date) where.date = date;
    if (status) where.status = status;

    const rundowns = await prisma.rundown.findMany({
      where,
      orderBy: [{ date: 'desc' }, { broadcastTime: 'asc' }],
    });

    return successResponse(rundowns.map(toFrontendRundown));
  } catch (e: any) {
    console.error('GET /api/rundowns error:', e);
    return errorResponse(e.message, 500);
  }
}

// POST /api/rundowns — Create rundown
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, date, broadcastTime, plannedDuration, status } = body;

    if (!title) return errorResponse('title is required');
    if (!date) return errorResponse('date is required');
    if (!broadcastTime) return errorResponse('broadcastTime is required');

    const rundownId = generateRundownId();

    const rundown = await prisma.rundown.create({
      data: {
        rundownId,
        title,
        date,
        broadcastTime,
        plannedDuration: plannedDuration || '00:30:00',
        status: status || 'PLANNING',
      },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'RUNDOWN',
      entityId: rundownId,
      newValue: { title, date, broadcastTime },
    });

    return successResponse(toFrontendRundown(rundown), 201);
  } catch (e: any) {
    console.error('POST /api/rundowns error:', e);
    return errorResponse(e.message, 500);
  }
}
