// src/store/useNewsForgeStore.ts
'use client';

import { create } from 'zustand';
import type { Story, StoryClip, Rundown, RundownEntry, User } from '@/types/types';
import { seedStories, seedClips, seedRundowns, seedRundownEntries, seedUsers } from './seedData';

interface NewsForgeState {
  // STATE
  stories: Story[];
  storyClips: StoryClip[];
  rundowns: Rundown[];
  rundownEntries: RundownEntry[];
  users: User[];

  // STORY ACTIONS
  createStory: (story: Story) => void;
  updateStory: (storyId: string, updates: Partial<Story>) => void; // Added updateStory because it's used in pages
  updateStoryField: (storyId: string, field: string, value: any) => void;
  deleteStory: (storyId: string) => void;
  submitStory: (storyId: string) => void; // Added submitStory because it's used in pages

  // CLIP ACTIONS
  addClip: (clip: StoryClip) => void;
  claimClip: (clipId: string, userId: string) => void;
  completeClip: (clipId: string, displayLabel: string) => void;
  deleteClip: (clipId: string) => void;

  // GETTERS
  getClipsByStory: (storyId: string) => StoryClip[];
  getClipsForStory: (storyId: string) => StoryClip[];

  // COPY EDITOR
  savePolishedScript: (storyId: string, script: string, userId: string) => void;
  clearPolishedScript: (storyId: string) => void;

  // SEND TO RUNDOWN
  sendToRundown: (storyId: string, rundownId: string) => void;

  // OUTPUT PAGE — sends clip to editor hub (just updates status)
  sendClipToEditorHub: (clipId: string, instructions?: string, notes?: string) => void; // Updated signature to match output page usage

  // RUNDOWN ACTIONS
  createStoryInRundown: (data: {
    rundownId: string;
    title: string;
    slug: string;
    format: Story['format'];
    plannedDuration: string;
    content: string;
  }) => void;
  addEntryToRundown: (rundownId: string, storyId: string) => void;
  removeEntryFromRundown: (entryId: string) => void;
  reorderRundownEntries: (rundownId: string, fromIndex: number, toIndex: number) => void;
  updateRundownEntryScript: (entryId: string, script: string) => void;
  updateRundownStatus: (rundownId: string, status: Rundown['status']) => void;

  // COMPUTED GETTERS
  getRundownsForDate: (date: string) => Rundown[];
  getEntriesForRundown: (rundownId: string) => RundownEntry[];
  getStoryCountForRundown: (rundownId: string) => number;
  getStoriesForCopyEditor: () => Story[];
}

export const useNewsForgeStore = create<NewsForgeState>()((set, get) => ({
  // ══════════ INITIAL STATE ══════════
  stories: seedStories || [],
  storyClips: seedClips || [],
  rundowns: seedRundowns || [],
  rundownEntries: seedRundownEntries || [],
  users: seedUsers || [],

  // ══════════ STORY ACTIONS ══════════
  createStory: (story) => {
    set((state) => ({
      stories: [
        ...state.stories,
        {
          ...story,
          rawScript: story.content || story.rawScript || '',
          polishedScript: story.polishedScript || null,
        },
      ],
    }));
  },

  updateStory: (storyId, updates) => {
    set((state) => ({
      stories: state.stories.map((s) => 
        (s.storyId === storyId || s.id === storyId) 
          ? { ...s, ...updates, updatedAt: new Date().toISOString() } 
          : s
      ),
    }));
  },

  updateStoryField: (storyId, field, value) => {
    set((state) => ({
      stories: state.stories.map((s) => {
        if (s.storyId !== storyId && s.id !== storyId) return s;
        const updated = { ...s, [field]: value, updatedAt: new Date().toISOString() };
        // If content changes, also update rawScript
        if (field === 'content') {
          updated.rawScript = value;
        }
        return updated;
      }),
    }));
  },

  deleteStory: (storyId) => {
    set((state) => ({
      stories: state.stories.filter((s) => s.storyId !== storyId && s.id !== storyId),
      storyClips: state.storyClips.filter((c) => c.storyId !== storyId),
      rundownEntries: state.rundownEntries.filter((e) => e.storyId !== storyId),
    }));
  },

  submitStory: (storyId) => {
    set((state) => ({
      stories: state.stories.map((s) =>
        (s.storyId === storyId || s.id === storyId)
          ? { ...s, status: 'SUBMITTED', updatedAt: new Date().toISOString() }
          : s
      ),
    }));
  },

  // ══════════ CLIP ACTIONS ══════════
  addClip: (clip) => {
    set((state) => ({
      storyClips: [
        ...state.storyClips,
        {
          ...clip,
          editingInstructions: clip.editingInstructions || '',
          editorialNotes: clip.editorialNotes || '',
        },
      ],
    }));
  },

  claimClip: (clipId, userId) => {
    set((state) => ({
      storyClips: state.storyClips.map((c) =>
        (c.clipId === clipId || c.id === clipId)
          ? { ...c, status: 'IN_PROCESS' as any, claimedBy: userId, claimedAt: new Date().toISOString() }
          : c
      ),
    }));
  },

  completeClip: (clipId, displayLabel) => {
    set((state) => ({
      storyClips: state.storyClips.map((c) =>
        (c.clipId === clipId || c.id === clipId)
          ? { ...c, status: 'COMPLETED' as any, displayLabel, completedAt: new Date().toISOString() }
          : c
      ),
    }));
  },

  deleteClip: (clipId) => {
    set((state) => ({
      storyClips: state.storyClips.filter((c) => c.clipId !== clipId && c.id !== clipId),
    }));
  },

  // ══════════ GETTERS ══════════
  getClipsByStory: (storyId) => {
    return get().storyClips.filter((c) => c.storyId === storyId);
  },

  getClipsForStory: (storyId) => {
    return get().storyClips.filter((c) => c.storyId === storyId);
  },

  // ══════════ OUTPUT PAGE ══════════
  sendClipToEditorHub: (clipId, instructions, notes) => {
    set((state) => ({
      storyClips: state.storyClips.map((c) =>
        (c.clipId === clipId || c.id === clipId)
          ? {
              ...c,
              status: 'PENDING' as any,
              editingInstructions: instructions || c.editingInstructions || '',
              editorialNotes: notes || c.editorialNotes || '',
              updatedAt: new Date().toISOString()
            }
          : c
      ),
    }));
    console.log('Clip sent to Editor Hub:', clipId, 'Instructions:', instructions);
  },

  // ══════════ COPY EDITOR ══════════
  savePolishedScript: (storyId, script, userId) => {
    set((state) => ({
      stories: state.stories.map((s) =>
        (s.storyId === storyId || s.id === storyId)
          ? {
              ...s,
              polishedScript: script,
              isPolished: true,
              polishedBy: userId,
              polishedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : s
      ),
    }));
  },

  clearPolishedScript: (storyId) => {
    set((state) => ({
      stories: state.stories.map((s) =>
        (s.storyId === storyId || s.id === storyId)
          ? { ...s, polishedScript: null, isPolished: false, polishedBy: null, polishedAt: null }
          : s
      ),
    }));
  },

  // ══════════ SEND TO RUNDOWN (CRITICAL) ══════════
  sendToRundown: (storyId, rundownId) => {
    const state = get();

    const story = state.stories.find((s) => s.storyId === storyId || s.id === storyId);
    if (!story) {
      console.error('sendToRundown: Story not found:', storyId);
      return;
    }

    const alreadyExists = state.rundownEntries.find(
      (e) => e.rundownId === rundownId && e.storyId === storyId
    );
    if (alreadyExists) {
      console.warn('sendToRundown: Story already in this rundown');
      return;
    }

    const scriptContent = story.polishedScript || story.rawScript || story.content || '';
    const scriptSource: 'POLISHED' | 'RAW' = story.polishedScript ? 'POLISHED' : 'RAW';

    const existingEntries = state.rundownEntries.filter((e) => e.rundownId === rundownId);
    const maxOrder = existingEntries.length > 0
      ? Math.max(...existingEntries.map((e) => e.orderIndex))
      : -1;

    const entryId = `RE-${Date.now()}`;
    const newEntry: RundownEntry = {
      entryId,
      id: entryId,
      rundownId,
      storyId,
      orderIndex: maxOrder + 1,
      scriptContent,
      scriptSource,
      overrideDuration: null,
      entryStatus: 'PENDING',
      notes: '',
    };

    // Create rundown if auto-generated and not in store yet
    let newRundowns = state.rundowns;
    const rundownExists = state.rundowns.find((r) => r.rundownId === rundownId || r.id === rundownId);

    if (!rundownExists) {
      const today = new Date().toISOString().split('T')[0];
      const timeMatch = rundownId.match(/(\d{2})(\d{2})$/);
      let broadcastTime = '00:00:00';
      let title = 'Bulletin';

      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        broadcastTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        const isPM = hour >= 12;
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        title = `${displayHour}:${String(minute).padStart(2, '0')} ${isPM ? 'PM' : 'AM'} Bulletin`;
      }

      newRundowns = [
        ...state.rundowns,
        {
          rundownId,
          id: rundownId,
          title,
          date: today,
          airDate: today,
          airTime: broadcastTime,
          broadcastTime,
          plannedDuration: '00:30:00',
          status: 'PLANNING',
          entries: [],
        },
      ];
    }

    const newStories = state.stories.map((s) =>
      (s.storyId === storyId || s.id === storyId)
        ? {
            ...s,
            sentToRundownId: rundownId,
            sentToRundownAt: new Date().toISOString(),
            sentBy: 'USR-001',
            scriptSentToRundown: scriptContent,
            anchorScript: scriptContent,
          }
        : s
    );

    set({
      stories: newStories,
      rundowns: newRundowns,
      rundownEntries: [...state.rundownEntries, newEntry],
    });

    console.log('sendToRundown: Entry created', entryId, 'for story', storyId, 'in rundown', rundownId);
  },

  // ══════════ RUNDOWN ACTIONS ══════════
  createStoryInRundown: (data) => {
    const state = get();
    const now = new Date().toISOString();
    const storyId = `STY-${Date.now()}`;

    const newStory: Story = {
      storyId,
      id: storyId,
      title: data.title,
      slug: data.slug || data.title.toUpperCase().replace(/\s+/g, '_').slice(0, 20),
      format: data.format,
      status: 'DRAFT',
      content: data.content || '',
      rawScript: data.content || '',
      polishedScript: null,
      anchorScript: '',
      voiceoverScript: '',
      editorialNotes: '',
      notes: '',
      category: 'National',
      location: '',
      date: now.split('T')[0],
      source: '',
      priority: 'normal',
      scriptSentToRundown: null,
      sentToRundownId: data.rundownId,
      sentToRundownAt: now,
      sentBy: 'USR-001',
      polishedBy: null,
      polishedAt: null,
      isPolished: false,
      createdBy: 'USR-001',
      createdAt: now,
      updatedAt: now,
      plannedDuration: data.plannedDuration || '00:00:00',
    };

    const existingEntries = state.rundownEntries.filter((e) => e.rundownId === data.rundownId);
    const maxOrder = existingEntries.length > 0
      ? Math.max(...existingEntries.map((e) => e.orderIndex))
      : -1;

    const entryId = `RE-${Date.now()}`;
    const newEntry: RundownEntry = {
      entryId,
      id: entryId,
      rundownId: data.rundownId,
      storyId,
      orderIndex: maxOrder + 1,
      scriptContent: data.content || '',
      scriptSource: 'RAW',
      overrideDuration: null,
      entryStatus: 'PENDING',
      notes: '',
    };

    set({
      stories: [...state.stories, newStory],
      rundownEntries: [...state.rundownEntries, newEntry],
    });
  },

  addEntryToRundown: (rundownId, storyId) => {
    const state = get();
    const story = state.stories.find((s) => s.storyId === storyId || s.id === storyId);

    const existingEntries = state.rundownEntries.filter((e) => e.rundownId === rundownId);
    const maxOrder = existingEntries.length > 0
      ? Math.max(...existingEntries.map((e) => e.orderIndex))
      : -1;

    const scriptContent = story
      ? (story.polishedScript || story.rawScript || story.content || '')
      : '';
    const scriptSource: 'POLISHED' | 'RAW' = story?.polishedScript ? 'POLISHED' : 'RAW';

    const entryId = `RE-${Date.now()}`;
    const newEntry: RundownEntry = {
      entryId,
      id: entryId,
      rundownId,
      storyId,
      orderIndex: maxOrder + 1,
      scriptContent,
      scriptSource,
      overrideDuration: null,
      entryStatus: 'PENDING',
      notes: '',
    };

    set({ rundownEntries: [...state.rundownEntries, newEntry] });
  },

  removeEntryFromRundown: (entryId) => {
    set((state) => ({
      rundownEntries: state.rundownEntries.filter((e) => e.entryId !== entryId && e.id !== entryId),
    }));
  },

  reorderRundownEntries: (rundownId, fromIndex, toIndex) => {
    set((state) => {
      const entries = state.rundownEntries.filter((e) => e.rundownId === rundownId);
      const others = state.rundownEntries.filter((e) => e.rundownId !== rundownId);
      const sorted = [...entries].sort((a, b) => a.orderIndex - b.orderIndex);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      const reindexed = sorted.map((e, i) => ({ ...e, orderIndex: i }));
      return { rundownEntries: [...others, ...reindexed] };
    });
  },

  updateRundownEntryScript: (entryId, script) => {
    set((state) => ({
      rundownEntries: state.rundownEntries.map((e) =>
        (e.entryId === entryId || e.id === entryId) ? { ...e, scriptContent: script } : e
      ),
    }));
  },

  updateRundownStatus: (rundownId, status) => {
    set((state) => ({
      rundowns: state.rundowns.map((r) =>
        (r.rundownId === rundownId || r.id === rundownId) ? { ...r, status } : r
      ),
    }));
  },

  // ══════════ COMPUTED GETTERS ══════════
  getRundownsForDate: (date) => {
    return get().rundowns.filter((r) => r.date === date || r.airDate === date);
  },

  getEntriesForRundown: (rundownId) => {
    return get().rundownEntries.filter((e) => e.rundownId === rundownId);
  },

  getStoryCountForRundown: (rundownId) => {
    return get().rundownEntries.filter(
      (e) => e.rundownId === rundownId && !e.storyId.startsWith('SYS-')
    ).length;
  },

  getStoriesForCopyEditor: () => {
    return get().stories.filter((s) => !s.storyId.startsWith('SYS-'));
  },
}));
