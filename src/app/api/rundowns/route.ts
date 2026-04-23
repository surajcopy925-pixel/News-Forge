// src/app/api/rundowns/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendRundown } from '@/lib/db-helpers';
import {
  successResponse,
  errorResponse,
  createAuditLog,
  generateRundownId,
} from '@/lib/api-helpers';
import { emitRundownEvent } from '@/lib/api-events';

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

// POST /api/rundowns — Create rundown (upsert: return existing if duplicate)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, date, broadcastTime, plannedDuration, status } = body;

    if (!title) return errorResponse('title is required');
    if (!date) return errorResponse('date is required');
    if (!broadcastTime) return errorResponse('broadcastTime is required');

    // Check if rundown already exists by rundownId or date + broadcastTime
    const finalRundownId = body.rundownId || generateRundownId();
    const existing = await prisma.rundown.findFirst({
      where: {
        OR: [
          { rundownId: finalRundownId },
          { date, broadcastTime }
        ]
      },
    });

    if (existing) {
      // Return existing rundown instead of failing with unique constraint
      return successResponse(toFrontendRundown(existing), 200);
    }

    // Create new rundown
    const rundown = await prisma.rundown.create({
      data: {
        rundownId: finalRundownId,
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
      entityId: rundown.rundownId,
      newValue: { title, date, broadcastTime },
    });

    emitRundownEvent('created', rundown.rundownId);

    return successResponse(toFrontendRundown(rundown), 201);
  } catch (e: any) {
    console.error('POST /api/rundowns error:', e);
    return errorResponse(e.message, 500);
  }
}