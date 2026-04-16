import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Only available in test/development
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  try {
    // Clean and reseed
    await prisma.rundownEntry.deleteMany();
    await prisma.storyClip.deleteMany();
    await prisma.story.deleteMany();
    await prisma.rundown.deleteMany();
    await prisma.user.deleteMany();

    // Resetting DB often requires a fresh start for sequences if used
    // But since we use IDs like STY-..., we are fine.

    // Seed test data
    await prisma.user.create({
      data: {
        userId: 'USR-TEST-001',
        fullName: 'Test Producer',
        role: 'PRODUCER',
        email: 'producer@newsforge.test',
      },
    });

    const rundown = await prisma.rundown.create({
      data: {
        rundownId: 'RD-TEST-001',
        title: 'Evening News Test',
        date: '2026-04-15',
        broadcastTime: '18:00',
        status: 'PLANNING',
      },
    });

    await prisma.story.create({
      data: {
        storyId: 'STY-2026-0001-KN',
        title: 'ಪರೀಕ್ಷಾ ಕಥೆ',
        slug: 'test-story',
        format: 'PKG',
        status: 'DRAFT',
        content: 'Test content',
        rawScript: 'ಕಚ್ಚಾ ಸ್ಕ್ರಿಪ್ಟ್',
        polishedScript: '',
        editorialNotes: '',
        rundownId: rundown.rundownId,
        createdBy: 'USR-TEST-001',
      },
    });

    await prisma.storyClip.create({
      data: {
        clipId: 'CLIP-TEST-001',
        storyId: 'STY-2026-0001-KN',
        fileName: 'raw_footage.mxf',
        originalFileName: 'raw_footage.mxf',
        fileUrl: '/media/raw/raw_footage.mxf',
        proxyUrl: '/media/proxy/raw_footage.mp4',
        status: 'PENDING',
      },
    });

    return NextResponse.json({ message: 'Test data reset complete' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
