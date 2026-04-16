import { prisma, cleanDatabase, seedTestData } from '../../../test-utils/db';

const BASE_URL = 'http://localhost:3000/api';

let testData: any;

beforeAll(async () => {
  await cleanDatabase();
  testData = await seedTestData();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('Clips API', () => {
  describe('GET /api/clips?storyId=:id', () => {
    it('returns clips for a story', async () => {
      const res = await fetch(
        `${BASE_URL}/clips?storyId=${testData.story.storyId}`
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/clips/:id/claim', () => {
    it('allows editor to claim an AVAILABLE clip', async () => {
      // First make clip AVAILABLE
      await fetch(`${BASE_URL}/clips/${testData.clip.clipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'AVAILABLE' }),
      });

      const res = await fetch(`${BASE_URL}/clips/${testData.clip.clipId}/claim`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimedBy: testData.user.userId }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('IN_PROGRESS');
      expect(data.claimedBy).toBe(testData.user.userId);
    });
  });
});
