const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const rundown = await prisma.rundown.findFirst();
    const story = await prisma.story.findFirst();
    
    if (rundown && story) {
      console.log(`Linking story ${story.storyId} to rundown ${rundown.rundownId}`);
      await prisma.story.update({
        where: { storyId: story.storyId },
        data: { 
            rundownId: rundown.rundownId,
            content: 'This is a test script for the teleprompter. It should appear in WinPlus.'
        }
      });
      console.log('SUCCESS');
    } else {
      console.log('MISSING_DATA');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
