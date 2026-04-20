const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const rundowns = await prisma.rundown.findMany({
      include: { stories: true }
    });
    for (const rd of rundowns) {
      console.log(`RUNDOWN_ID:${rd.rundownId} STORIES:${rd.stories ? rd.stories.length : 0}`);
    }
    if (rundowns.length === 0) console.log('NO_RUNDOWN_FOUND');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();


