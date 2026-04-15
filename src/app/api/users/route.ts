import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFrontendUser } from '@/lib/db-helpers';
import { successResponse, errorResponse } from '@/lib/api-helpers';

// GET /api/users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    const where: any = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });

    return successResponse(users.map(toFrontendUser));
  } catch (e: any) {
    console.error('GET /api/users error:', e);
    return errorResponse(e.message, 500);
  }
}
