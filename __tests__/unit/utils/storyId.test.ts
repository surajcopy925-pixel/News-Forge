import { generateStoryId, parseStoryId } from '@/utils/storyId';

describe('Story ID Generation', () => {
  it('generates ID in correct format', () => {
    const id = generateStoryId(42, 'KN');
    // Using 2026 as the current year is 2026 in the user's environment
    expect(id).toBe('STY-2026-0042-KN');
  });

  it('generates English suffix', () => {
    const id = generateStoryId(1, 'EN');
    expect(id).toMatch(/^STY-\d{4}-0001-EN$/);
  });

  it('pads sequential number to 4 digits', () => {
    const id = generateStoryId(7, 'KN');
    expect(id).toContain('-0007-');
  });

  it('parses story ID correctly', () => {
    const parsed = parseStoryId('STY-2026-0042-KN');
    expect(parsed).toEqual({
      prefix: 'STY',
      year: 2026,
      sequence: 42,
      language: 'KN',
    });
  });

  it('rejects malformed IDs', () => {
    expect(() => parseStoryId('INVALID')).toThrow();
    expect(() => parseStoryId('STY-XXXX-0001-KN')).toThrow();
  });
});
