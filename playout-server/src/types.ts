// ─── Rundown List Types ─────────────────────────────────────

export interface RundownSummary {
  rundownId: string;
  title: string;
  date: string;
  broadcastTime: string;
  status: string;
  plannedDuration: string;
  entryCount: number;
}

// ─── Playout Clip Types ─────────────────────────────────────

export interface PlaylistClip {
  id: string;
  playoutName: string;
  fileName: string;
  storyTitle: string;
  storyId: string;
  category: string;
  duration: string;
  status: 'READY' | 'PLAYING' | 'PLAYED' | 'STOPPED';
  isStoryBreak?: boolean;  // visual separator between stories
  orderIndex: number;       // rundown entry order
}

// ─── API Response Types ─────────────────────────────────────

export interface RundownClipFromAPI {
  clipId: string;
  fileName: string;
  playoutName: string;
  duration: string;
  status: string;
  fileUrl: string;
  proxyUrl: string;
}

export interface RundownEntryFromAPI {
  entryId: string;
  orderIndex: number;
  storyId: string;
  storyTitle: string;
  storyFormat: string;
  clips: RundownClipFromAPI[];
}

export interface RundownDetailResponse {
  rundown: {
    rundownId: string;
    title: string;
    date: string;
    broadcastTime: string;
    status: string;
    plannedDuration: string;
  };
  entries: RundownEntryFromAPI[];
}

export interface RundownListResponse {
  rundowns: RundownSummary[];
}

// ─── Channel Info Types ─────────────────────────────────────

export interface ChannelInfo {
  channel: number;
  layer: number;
  status: string;
  file: string;
  time: number;
  duration: number;
  fps: number;
  loop: boolean;
}
