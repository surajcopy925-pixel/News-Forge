let storyCounter = 0;
let clipCounter = 0;

export function buildStory(overrides: Record<string, any> = {}) {
  storyCounter++;
  return {
    storyId: `STY-2026-${String(storyCounter).padStart(4, '0')}-EN`,
    title: `Test Story ${storyCounter}`,
    slug: `test-story-${storyCounter}`,
    format: 'PKG' as const,
    status: 'DRAFT' as const,
    content: `Content for story ${storyCounter}`,
    rawScript: `Raw script ${storyCounter}`,
    polishedScript: '',
    editorialNotes: '',
    ...overrides,
  };
}

export function buildClip(storyId: string, overrides: Record<string, any> = {}) {
  clipCounter++;
  return {
    clipId: `CLIP-${String(clipCounter).padStart(4, '0')}`,
    storyId,
    fileName: `footage_${clipCounter}.mxf`,
    fileUrl: `/media/raw/footage_${clipCounter}.mxf`,
    proxyUrl: `/media/proxy/footage_${clipCounter}.mp4`,
    status: 'PENDING' as const,
    ...overrides,
  };
}

export function buildRundown(overrides: Record<string, any> = {}) {
  return {
    rundownId: `RD-${Date.now()}`,
    title: 'Test Rundown',
    date: '2026-04-15',
    broadcastTime: '18:00',
    status: 'DRAFT' as const,
    ...overrides,
  };
}

export function resetFactories() {
  storyCounter = 0;
  clipCounter = 0;
}
