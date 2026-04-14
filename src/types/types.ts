export type StoryStatus = 'DRAFT' | 'SUBMITTED' | 'EDITING' | 'READY' | 'APPROVED' | 'NOT READY' | 'ON_AIR' | 'DONE';
export type ClipStatus = 'PENDING' | 'EDITING' | 'DONE' | 'AVAILABLE' | 'IN_PROCESS' | 'COMPLETED' | 'APPROVED';

export interface User {
  userId: string;
  fullName: string;
  role: string;
}

export interface Story {
  storyId: string;
  title: string;
  slug: string;
  category: string;
  format: 'ANCHOR' | 'PKG' | 'VO' | 'VO+BITE' | 'LIVE' | 'GFX' | 'BREAK' | 'PHONE-IN' | 'OOV' | '';
  location: string;
  source: string;
  content: string;
  rawScript: string;
  polishedScript: string | null;
  anchorScript: string;
  voiceoverScript: string;
  editorialNotes: string;
  status: StoryStatus;
  priority: 'URGENT' | 'NORMAL' | 'LOW';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Script tracking
  isPolished: boolean;
  polishedBy: string | null;
  polishedAt: string | null;
  
  // Rundown tracking
  rundownId: string | null;
  orderIndex: number;
  plannedDuration: string;
  sentToRundownId: string | null;
  sentToRundownAt: string | null;
  sentBy: string | null;
  scriptSentToRundown: string | null;

  // UI/Compatibility fields
  id?: string; // Alias for storyId
  notes?: string; // Alias for editorialNotes
  editedScript?: string;
  isScriptEdited?: boolean;
}

export interface StoryClip {
  clipId: string;
  storyId: string;

  // FILE INFO
  fileName: string;
  originalFileName: string;
  fileUrl: string | null;
  fileType: string;

  // CLIP DATA
  displayLabel: string;
  duration: string | null;
  status: ClipStatus;

  // TRACKING
  claimedBy: string | null;
  claimedAt: string | null;
  completedAt: string | null;

  // ✅ ADDED FIELDS
  editingInstructions: string;
  editorialNotes: string;
}

export interface Rundown {
  rundownId: string;
  title: string;
  date: string;
  broadcastTime: string;
  plannedDuration: string;
  status: 'PLANNING' | 'READY' | 'LIVE' | 'COMPLETED';
  entries: RundownEntry[];
}

export interface RundownEntry {
  entryId: string;
  rundownId: string;
  storyId: string;
  orderIndex: number;
  overrideDuration: string | null;
  entryStatus: 'PENDING' | 'READY' | 'LIVE' | 'DONE';
  notes: string;
  scriptContent?: string | null;
  scriptSource?: 'POLISHED' | 'RAW' | null;
}

export interface CGItem {
  cgId: string;
  id: string;
  storyId: string;
  cgType: string;
  templateName: string;
  displayLabel: string;
  status: string;
  content: any;
}

