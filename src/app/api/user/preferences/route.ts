import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PREFERENCES } from '@/types/preferences';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: session.user.userId },
    });

    return NextResponse.json(prefs ? { themePreset: prefs.themePreset } : DEFAULT_PREFERENCES);
  } catch (error) {
    console.error('[PREFERENCES_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const prefs = await prisma.userPreferences.upsert({
      where: { userId: session.user.userId },
      update: { themePreset: body.themePreset, updatedAt: new Date() },
      create: {
        userId: session.user.userId,
        themePreset: body.themePreset ?? DEFAULT_PREFERENCES.themePreset,
      },
    });

    return NextResponse.json({ themePreset: prefs.themePreset });
  } catch (error) {
    console.error('[PREFERENCES_PUT]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
