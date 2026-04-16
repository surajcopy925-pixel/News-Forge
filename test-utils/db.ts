import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanDatabase() {
  // Delete in correct order to respect foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.rundownEntry.deleteMany();
  await prisma.storyClip.deleteMany();
  await prisma.story.deleteMany();
  await prisma.rundown.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedTestData() {
  const user = await prisma.user.create({
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

  const story = await prisma.story.create({
    data: {
      storyId: 'STY-2026-0001-KN',
      title: 'ಪರೀಕ್ಷಾ ಕಥೆ',
      slug: 'test-story-kannada',
      format: 'PKG',
      status: 'DRAFT',
      content: 'Test content',
      rawScript: 'ಇದು ಕನ್ನಡ ಕಚ್ಚಾ ಸ್ಕ್ರಿಪ್ಟ್',
      polishedScript: '',
      editorialNotes: '',
      rundownId: rundown.rundownId,
      createdBy: 'USR-TEST-001',
    },
  });

  const clip = await prisma.storyClip.create({
    data: {
      clipId: 'CLIP-TEST-001',
      storyId: story.storyId,
      fileName: 'raw_footage_001.mxf',
      originalFileName: 'raw_footage_001.mxf',
      fileUrl: '/media/raw/raw_footage_001.mxf',
      proxyUrl: '/media/proxy/raw_footage_001.mp4',
      status: 'PENDING',
    },
  });

  return { user, rundown, story, clip };
}

export { prisma };
