// src/utils/storyId.ts

/**
 * Generates a unique story ID following the convention:
 * STY-YYYY-NNNN-LANG
 * 
 * @param sequence - The sequential number for the story
 * @param language - 'EN' or 'KN'
 */
export function generateStoryId(sequence: number, language: 'EN' | 'KN'): string {
  const year = new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(4, '0');
  return `STY-${year}-${paddedSequence}-${language}`;
}

/**
 * Parses a story ID into its components.
 * Throws if the ID is malformed.
 */
export function parseStoryId(id: string) {
  const regex = /^STY-(\d{4})-(\d{4})-(EN|KN)$/;
  const match = id.match(regex);
  
  if (!match) {
    throw new Error('Invalid story ID format');
  }

  return {
    prefix: 'STY',
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
    language: match[3] as 'EN' | 'KN',
  };
}
