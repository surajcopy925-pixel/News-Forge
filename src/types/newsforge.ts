export type StoryStatus = "DRAFT" | "SUBMITTED" | "EDITING" | "READY" | "ARCHIVED";
export type ClipStatus = "RAW" | "AVAILABLE" | "IN_PROCESS" | "COMPLETED" | "APPROVED";
export type StoryPriority = "low" | "normal" | "urgent" | "breaking";

export interface Story {
  id: string;
  title: string;
  slug: string;
  category: string;
  format: string;
  location: string;
  date: string;
  source: string;
  content: string;
  anchorScript: string;
  voiceoverScript: string;
  notes: string;
  priority: StoryPriority;
  status: StoryStatus;
  createdBy: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  editedScript: string;
  scriptEditedBy: string | null;
  scriptEditedAt: string | null;
  isScriptEdited: boolean;
  sentToRundownId?: string | null;
  sentToRundownAt?: string | null;
  sentBy?: string | null;
  scriptSentToRundown?: string | null;
}

export interface Clip {
  id: string;
  storyId: string;
  fileName: string;
  originalFileName: string;
  fileUrl: string | null;
  displayLabel: string | null;
  status: ClipStatus;
  editingInstructions: string;
  editorialNotes: string;
  claimedBy: string | null;
  duration: string | null;
  codec: string | null;
  resolution: string | null;
  fileSize?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CGItem {
  id: string;
  storyId: string;
  cgType: string;
  templateName: string;
  displayLabel: string;
  status: string;
  content: any;
}

export interface Rundown {
  id: string;
  title: string;
  airDate: string;
  airTime: string;
  plannedDuration: string;
  status: string;
  headline?: string;
  startTime?: string;
  endTime?: string;
  break1After?: number;
  break1Duration?: string;
  break2After?: number;
  break2Duration?: string;
  entries: RundownEntry[];
}

export interface RundownEntry {
  id: string;
  rundownId: string;
  storyId: string;
  orderIndex: number;
  overrideDuration: string | null;
  entryStatus: string;
  notes: string;
  entryId: string;
  scriptContent?: string | null;
  scriptSource?: 'POLISHED' | 'RAW' | null;
}
