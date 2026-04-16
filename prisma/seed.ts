import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const defaultPasswordHash = await bcrypt.hash('newsforge123', 10);

  // ═══════════════════════════════════════
  // CLEAN ALL TABLES (order matters for FK)
  // ═══════════════════════════════════════
  await prisma.auditLog.deleteMany();
  await prisma.rundownEntry.deleteMany();
  await prisma.storyClip.deleteMany();
  await prisma.story.deleteMany();
  await prisma.rundown.deleteMany();
  await prisma.user.deleteMany();

  // ═══════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════
  const users = await Promise.all([
    prisma.user.create({
      data: {
        userId: 'USR-001',
        fullName: 'Priya Sharma',
        role: 'PRODUCER',
        email: 'priya.sharma@newsforge.com',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.create({
      data: {
        userId: 'USR-002',
        fullName: 'Rahul Menon',
        role: 'EDITOR',
        email: 'rahul.menon@newsforge.com',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.create({
      data: {
        userId: 'USR-003',
        fullName: 'Kavitha Rao',
        role: 'COPY_EDITOR',
        email: 'kavitha.rao@newsforge.com',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.create({
      data: {
        userId: 'USR-004',
        fullName: 'Suresh Kumar',
        role: 'ADMIN',
        email: 'suresh.kumar@newsforge.com',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.create({
      data: {
        userId: 'USR-005',
        fullName: 'Deepa Nair',
        role: 'REPORTER',
        email: 'deepa.nair@newsforge.com',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.create({
      data: {
        userId: 'USR-006',
        fullName: 'Arjun Patel',
        role: 'REPORTER',
        email: 'arjun.patel@newsforge.com',
        passwordHash: defaultPasswordHash,
      },
    }),
  ]);

  console.log(`  ✅ Created ${users.length} users`);

  // ═══════════════════════════════════════
  // STORIES (matching your Input page)
  // ═══════════════════════════════════════
  const stories = await Promise.all([
    prisma.story.create({
      data: {
        storyId: 'STY-20250610-001',
        title: 'CM Press Conference',
        slug: 'cm-press-conference',
        format: 'PKG',
        status: 'SUBMITTED',
        category: 'Politics',
        location: 'Bengaluru',
        source: 'Staff Reporter',
        language: 'en',
        priority: 'URGENT',
        content: 'Chief Minister to address key issues regarding the new infrastructure bill.',
        rawScript: 'Chief Minister to address key issues regarding the new infrastructure bill.',
        editorialNotes: 'Urgent coverage requested.',
        plannedDuration: '00:02:30',
        createdBy: 'USR-005',
      },
    }),
    prisma.story.create({
      data: {
        storyId: 'STY-20250610-002',
        title: 'ದೃಷ್ಯ ಕನ್ನಡ ಪ್ರಭಾತ',
        slug: 'drishya-kannada-prabhat',
        format: 'VO',
        status: 'DRAFT',
        category: 'National',
        location: 'Mysuru',
        source: 'Field Correspondent',
        language: 'kn',
        priority: 'NORMAL',
        content: 'ಕನ್ನಡ ಪ್ರಭಾತ ಕಾರ್ಯಕ್ರಮದ ವಿಶೇಷ ವರದಿ.',
        rawScript: 'ಕನ್ನಡ ಪ್ರಭಾತ ಕಾರ್ಯಕ್ರಮದ ವಿಶೇಷ ವರದಿ.',
        plannedDuration: '00:01:30',
        createdBy: 'USR-006',
      },
    }),
  ]);
  console.log(`  ✅ Created ${stories.length} stories`);

  // ═══════════════════════════════════════
  // CLIPS (matching your Editor Hub page)
  // ═══════════════════════════════════════
  const clips = await Promise.all([
    prisma.storyClip.create({
      data: {
        clipId: 'STY-20250610-001_C01',
        storyId: 'STY-20250610-001',
        fileName: 'STY-20250610-001_C01_RAW.mxf',
        originalFileName: 'interview_take1.mxf',
        fileType: 'VIDEO/MP4',
        duration: '00:45',
        displayLabel: 'Interview Take 1',
        status: 'DONE',
        claimedBy: 'USR-002',
        claimedAt: new Date('2025-06-10T10:00:00Z'),
        completedAt: new Date('2025-06-10T11:30:00Z'),
        editingInstructions: 'Cut the first 5 seconds.',
        editorialNotes: 'Good audio quality.',
      },
    }),
  ]);
  console.log(`  ✅ Created ${clips.length} clips`);

  // ═══════════════════════════════════════
  // AUDIT LOG (initial entry)
  // ═══════════════════════════════════════
  await prisma.auditLog.create({
    data: {
      userId: 'USR-004',
      action: 'SEED',
      entity: 'SYSTEM',
      entityId: 'SYSTEM',
      metadata: { message: 'Database seeded with initial data' },
    },
  });
  console.log('  ✅ Created audit log entry');

  console.log('\n🎉 Seeding complete!');
  console.log('   Stories: 2 (Politics: 1, National: 1)');
  console.log('   Clips: 1 (DONE)');
  console.log('   Users: 6');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
