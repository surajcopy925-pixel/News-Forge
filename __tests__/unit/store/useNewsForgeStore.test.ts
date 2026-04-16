import { act } from '@testing-library/react';

// Reset modules to get fresh store each test
let useNewsForgeStore: any;

beforeEach(async () => {
  jest.resetModules();
  // Clear localStorage mock
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  })();
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

  const mod = await import('@/store/useNewsForgeStore');
  useNewsForgeStore = mod.useNewsForgeStore;
});

describe('News Forge Zustand Store', () => {
  describe('Stories', () => {
    it('starts with an empty or seeded stories array', () => {
      const state = useNewsForgeStore.getState();
      expect(Array.isArray(state.stories)).toBe(true);
    });

    it('adds a new story', () => {
      const { createStory } = useNewsForgeStore.getState();

      act(() => {
        createStory({
          storyId: 'STY-2026-0099-EN',
          title: 'Breaking News Test',
          slug: 'breaking-test',
          format: 'VO',
          status: 'DRAFT',
          content: 'Test content',
          rawScript: 'Raw test',
          polishedScript: '',
          editorialNotes: '',
          category: 'Politics',
          language: 'en',
          priority: 'NORMAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      const stories = useNewsForgeStore.getState().stories;
      const found = stories.find((s: any) => s.storyId === 'STY-2026-0099-EN');
      expect(found).toBeDefined();
      expect(found.title).toBe('Breaking News Test');
    });

    it('updates story fields', () => {
      const { createStory, updateStoryField } = useNewsForgeStore.getState();

      act(() => {
        createStory({
          storyId: 'STY-2026-0100-KN',
          title: 'Status Test',
          slug: 'status-test',
          format: 'ANCHOR',
          status: 'DRAFT',
          content: '',
          rawScript: '',
          polishedScript: '',
          editorialNotes: '',
          category: 'Politics',
          language: 'kn',
          priority: 'NORMAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      act(() => {
        updateStoryField('STY-2026-0100-KN', 'status', 'READY');
      });

      const story = useNewsForgeStore.getState().stories
        .find((s: any) => s.storyId === 'STY-2026-0100-KN');
      expect(story.status).toBe('READY');
    });

    it('removes a story', () => {
      const { createStory, deleteStory } = useNewsForgeStore.getState();

      act(() => {
        createStory({
          storyId: 'STY-2026-0101-EN',
          title: 'To Delete',
          slug: 'to-delete',
          format: 'PKG',
          status: 'DRAFT',
          content: '',
          rawScript: '',
          polishedScript: '',
          editorialNotes: '',
          category: 'Politics',
          language: 'en',
          priority: 'NORMAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      act(() => {
        deleteStory('STY-2026-0101-EN');
      });

      const stories = useNewsForgeStore.getState().stories;
      expect(stories.find((s: any) => s.storyId === 'STY-2026-0101-EN'))
        .toBeUndefined();
    });
  });

  describe('Clips', () => {
    it('adds a clip to a story', () => {
      const { addClip } = useNewsForgeStore.getState();

      act(() => {
        addClip({
          clipId: 'CLIP-0001',
          storyId: 'STY-2026-0099-EN',
          fileName: 'footage.mxf',
          originalFileName: 'footage.mxf',
          fileUrl: '/media/raw/footage.mxf',
          fileType: 'video/mxf',
          status: 'PENDING',
        });
      });

      const storyClips = useNewsForgeStore.getState().storyClips;
      expect(storyClips.find((c: any) => c.clipId === 'CLIP-0001')).toBeDefined();
    });
  });
});
