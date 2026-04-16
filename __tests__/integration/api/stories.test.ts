import { prisma, cleanDatabase, seedTestData } from '../../../test-utils/db';
import { buildStory } from '../../../test-utils/factories';

const BASE_URL = 'http://localhost:3000/api';

beforeAll(async () => {
  await cleanDatabase();
  await seedTestData();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('Stories API', () => {
  describe('GET /api/stories', () => {
    it('returns all stories', async () => {
      const res = await fetch(`${BASE_URL}/stories`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('each story has required fields', async () => {
      const res = await fetch(`${BASE_URL}/stories`);
      const data = await res.json();

      data.forEach((story: any) => {
        expect(story).toHaveProperty('storyId');
        expect(story).toHaveProperty('title');
        expect(story).toHaveProperty('format');
        expect(story).toHaveProperty('status');
      });
    });
  });

  describe('POST /api/stories', () => {
    it('creates a new story', async () => {
      const newStory = buildStory({
        storyId: 'STY-2026-9001-EN',
        title: 'API Created Story',
      });

      const res = await fetch(`${BASE_URL}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStory),
      });

      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.storyId).toBe('STY-2026-9001-EN');
      expect(data.title).toBe('API Created Story');
    });

    it('rejects duplicate story ID', async () => {
      const duplicate = buildStory({ storyId: 'STY-2026-0001-KN' }); // exists from seed

      const res = await fetch(`${BASE_URL}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicate),
      });

      expect(res.status).toBe(409);
    });

    it('validates required fields', async () => {
      const res = await fetch(`${BASE_URL}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Missing fields' }),
      });

      expect(res.status).toBe(400);
    });
  });
});
