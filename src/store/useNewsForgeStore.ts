import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { 
  Story, 
  Clip, 
  CGItem, 
  Rundown, 
  RundownEntry, 
  StoryStatus, 
  ClipStatus 
} from "../types/newsforge";
import { MOCK_STORIES, MOCK_CLIPS, MOCK_RUNDOWNS } from "./seedData";

interface NewsForgeState {
  stories: Story[];
  clips: Clip[];
  rundowns: Rundown[];
  rundownEntries: RundownEntry[];
  cgItems: CGItem[];

  // === STORY ACTIONS ===
  addStory: (story: Omit<Story, "id" | "createdAt" | "updatedAt">) => string;
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  submitStory: (id: string) => void;
  updateEditedScript: (storyId: string, editedScript: string) => void;
  updateEditedScript: (storyId: string, editedScript: string) => void;
  sendToRundown: (storyId: string, rundownId: string) => void;

  // === CLIP ACTIONS ===
  addClip: (clip: Clip) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  deleteClip: (id: string) => void;
  sendClipToEditorHub: (clipId: string, instructions: string, notes: string) => void;
  claimClip: (clipId: string, editorName: string) => void;
  completeClip: (clipId: string, displayLabel: string) => void;
  approveClip: (clipId: string) => void;

  // === CG ACTIONS ===
  addCG: (cgData: Omit<CGItem, "id">) => string;
  updateCG: (id: string, updates: Partial<CGItem>) => void;
  deleteCG: (id: string) => void;

  // === RUNDOWN ACTIONS ===
  addStoryToRundown: (rundownId: string, storyId: string) => void;
  removeStoryFromRundown: (rundownId: string, entryId: string) => void;
  reorderRundownEntries: (rundownId: string, fromIndex: number, toIndex: number) => void;
  removeEntryFromRundown: (entryId: string) => void;
  updateRundownEntry: (rundownId: string, entryId: string, updates: Partial<RundownEntry>) => void;
  updateRundown: (id: string, updates: Partial<Rundown>) => void;

  // === SELECTORS ===
  getClipsByStory: (storyId: string) => Clip[];
  getClipsForStory: (storyId: string) => Clip[];
}

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

export const useNewsForgeStore = create<NewsForgeState>()(
  immer((set, get) => ({
    stories: MOCK_STORIES,
    clips: MOCK_CLIPS,
    rundowns: MOCK_RUNDOWNS,
    rundownEntries: MOCK_RUNDOWNS.flatMap(r => r.entries.map(e => ({...e, entryId: e.id}))),
    cgItems: [],

    addStory: (storyData) => {
      const id = storyData.id || generateId("STY");
      const now = new Date().toISOString();
      const newStory: Story = {
        title: "", slug: "", category: "", format: "", location: "",
        date: "", source: "", content: "", anchorScript: "",
        voiceoverScript: "", notes: "", priority: "normal", status: "DRAFT",
        createdBy: "Unknown", assignedTo: null, ...storyData,
        id, createdAt: now, updatedAt: now, editedScript: "",
        scriptEditedBy: null, scriptEditedAt: null, isScriptEdited: false,
      };
      set((state) => { state.stories.push(newStory); });
      return id;
    },

    updateStory: (id, updates) => {
      set((state) => {
        const story = state.stories.find(s => s.id === id);
        if (story) {
          Object.assign(story, updates);
          story.updatedAt = new Date().toISOString();
        }
      });
    },

    deleteStory: (id) => {
      set((state) => {
        state.stories = state.stories.filter(s => s.id !== id);
        state.clips = state.clips.filter(c => c.storyId !== id);
        state.cgItems = state.cgItems.filter(cg => cg.storyId !== id);
        state.rundowns.forEach(r => {
          r.entries = r.entries.filter(e => e.storyId !== id);
        });
      });
    },

    submitStory: (id) => {
      set((state) => {
        const story = state.stories.find(s => s.id === id);
        if (story) {
          story.status = "SUBMITTED";
          story.updatedAt = new Date().toISOString();
        }
      });
    },

    updateEditedScript: (storyId, editedScript) => {
      set((state) => {
        const story = state.stories.find(s => s.id === storyId);
        if (story) {
          story.editedScript = editedScript;
          story.isScriptEdited = true;
          story.updatedAt = new Date().toISOString();
        }
      });
    },

    sendToRundown: (storyId, rundownId) => {
      const state = get();
      
      // Find the story
      const story = state.stories.find((s) => s.id === storyId);
      if (!story) {
        console.error('sendToRundown: Story not found:', storyId);
        return;
      }

      // Check if already in this rundown
      const alreadyExists = state.rundownEntries.find(
        (e) => e.rundownId === rundownId && e.storyId === storyId
      );
      if (alreadyExists) {
        console.warn('sendToRundown: Story already in this rundown');
        return;
      }

      // Determine script content
      const scriptContent = story.isScriptEdited ? story.editedScript : story.anchorScript || story.content || '';
      const scriptSource: 'POLISHED' | 'RAW' = story.isScriptEdited ? 'POLISHED' : 'RAW';

      // Get max order index for this rundown
      const existingEntries = state.rundownEntries.filter((e) => e.rundownId === rundownId);
      const maxOrder = existingEntries.length > 0
        ? Math.max(...existingEntries.map((e) => e.orderIndex))
        : -1;

      // Create entry
      const newEntry: RundownEntry = {
        id: `RE-${Date.now()}`,
        entryId: `RE-${Date.now()}`,
        rundownId,
        storyId,
        orderIndex: maxOrder + 1,
        scriptContent,
        scriptSource,
        overrideDuration: null,
        entryStatus: 'PENDING',
        notes: '',
      };

      // Ensure rundown exists in store (auto-generated bulletins aren't stored yet)
      let newRundowns = state.rundowns;
      const rundownExists = state.rundowns.find((r) => r.id === rundownId);
      
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
            id: rundownId,
            title,
            airDate: today,
            airTime: broadcastTime,
            plannedDuration: '00:30:00',
            status: 'PLANNING',
            entries: [],
          },
        ];
      }

      // Update story
      const newStories = state.stories.map((s) =>
        s.id === storyId
          ? {
              ...s,
              sentToRundownId: rundownId,
              sentToRundownAt: new Date().toISOString(),
              sentBy: 'USR-001',
              scriptSentToRundown: scriptContent,
            }
          : s
      );

      set({
        stories: newStories,
        rundowns: newRundowns,
        rundownEntries: [...state.rundownEntries, newEntry],
      });

      console.log('✅ sendToRundown complete:', storyId, '→', rundownId);
    },

    addClip: (clip) => {
      set((state) => {
        state.clips.push(clip);
      });
    },

    updateClip: (id, updates) => {
      set((state) => {
        const clip = state.clips.find(c => c.id === id);
        if (clip) {
          Object.assign(clip, updates);
          clip.updatedAt = new Date().toISOString();
        }
      });
    },

    deleteClip: (id) => {
      set((state) => { state.clips = state.clips.filter(c => c.id !== id); });
    },

    sendClipToEditorHub: (clipId, instructions, notes) => {
      set((state) => {
        const clip = state.clips.find(c => c.id === clipId);
        if (clip) {
          clip.status = "AVAILABLE";
          clip.editingInstructions = instructions;
          clip.editorialNotes = notes;
          clip.updatedAt = new Date().toISOString();
        }
      });
    },

    claimClip: (clipId, editorName) => {
      set((state) => {
        const clip = state.clips.find(c => c.id === clipId);
        if (clip && clip.status === "AVAILABLE") {
          clip.status = "IN_PROCESS";
          clip.claimedBy = editorName;
          clip.updatedAt = new Date().toISOString();
        }
      });
    },

    completeClip: (clipId, displayLabel) => {
      set((state) => {
        const clip = state.clips.find(c => c.id === clipId);
        if (clip && clip.status === "IN_PROCESS") {
          clip.status = "COMPLETED";
          clip.displayLabel = displayLabel;
          clip.updatedAt = new Date().toISOString();
        }
      });
    },

    approveClip: (clipId) => {
      set((state) => {
        const clip = state.clips.find(c => c.id === clipId);
        if (clip) { clip.status = "APPROVED"; clip.updatedAt = new Date().toISOString(); }
      });
    },

    addCG: (cgData) => {
      const id = generateId("CG");
      set((state) => { state.cgItems.push({ ...cgData, id }); });
      return id;
    },

    updateCG: (id, updates) => {
      set((state) => {
        const cg = state.cgItems.find(item => item.id === id);
        if (cg) Object.assign(cg, updates);
      });
    },

    deleteCG: (id) => {
      set((state) => { state.cgItems = state.cgItems.filter(cg => cg.id !== id); });
    },

    addStoryToRundown: (rundownId, storyId) => {
      set((state) => {
        const rundown = state.rundowns.find(r => r.id === rundownId);
        if (rundown) {
          rundown.entries.push({
            id: generateId("RE"), rundownId, storyId, orderIndex: rundown.entries.length,
            overrideDuration: null, entryStatus: "PENDING", notes: "",
          });
        }
      });
    },

    removeStoryFromRundown: (rundownId, entryId) => {
      set((state) => {
        const rundown = state.rundowns.find(r => r.id === rundownId);
        if (rundown) {
          rundown.entries = rundown.entries.filter(e => e.id !== entryId);
          rundown.entries.forEach((e, idx) => { e.orderIndex = idx; });
        }
      });
    },

    reorderRundownEntries: (rundownId: string, fromIndex: number, toIndex: number) => {
      set((state) => {
        // Get all entries for this rundown, sorted
        const entries = state.rundownEntries
          .filter((e) => e.rundownId === rundownId)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        // Reorder
        const item = entries[fromIndex];
        if (!item) return;

        const reordered = [...entries];
        reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, item);

        // Re-index
        reordered.forEach((entry, idx) => {
          entry.orderIndex = idx;
        });

        // The filtered entries are already updated in place if using immer? 
        // No, we need to update the state correctly.
        // Since we are using immer, we can just modify state.rundownEntries.
        
        // Actually, let's just replace the entries for this rundown
        const otherEntries = state.rundownEntries.filter((e) => e.rundownId !== rundownId);
        state.rundownEntries = [...otherEntries, ...reordered];
      });
    },

    removeEntryFromRundown: (entryId: string) => {
      set((state) => {
        state.rundownEntries = state.rundownEntries.filter((e) => e.entryId !== entryId);
      });
    },

    updateRundownEntry: (rundownId, entryId, updates) => {
      set((state) => {
        const rundown = state.rundowns.find(r => r.id === rundownId);
        if (rundown) {
          const entry = rundown.entries.find(e => e.id === entryId);
          if (entry) Object.assign(entry, updates);
        }
      });
    },

    updateRundown: (id, updates) => {
      set((state) => {
        const rundown = state.rundowns.find(r => r.id === id);
        if (rundown) Object.assign(rundown, updates);
      });
    },

    getClipsByStory: (storyId) => {
      return get().clips.filter(c => c.storyId === storyId);
    },

    getClipsForStory: (storyId) => {
      return get().getClipsByStory(storyId);
    },

  }))
);
