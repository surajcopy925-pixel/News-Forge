import { Story, StoryClip as Clip, Rundown, RundownEntry, User } from '../types/types';

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

export const MOCK_USERS: User[] = [
  { userId: 'USR-001', fullName: 'Rajesh Kumar', role: 'ADMIN' },
  { userId: 'USR-002', fullName: 'Priya Sharma', role: 'PRODUCER' },
  { userId: 'USR-003', fullName: 'Rahul M', role: 'EDITOR' },
  { userId: 'Admin', fullName: 'System Admin', role: 'ADMIN' },
  { userId: 'Reporter1', fullName: 'Reporter One', role: 'REPORTER' },
  { userId: 'Producer1', fullName: 'Producer One', role: 'PRODUCER' },
  { userId: 'SportsReporter', fullName: 'Sports Reporter', role: 'REPORTER' },
];

export const MOCK_STORIES: Story[] = [
  {
    storyId: 'STY-20250610-001',
    id: 'STY-20250610-001',
    title: 'CM Press Conference',
    slug: 'cm-press-conf',
    category: 'Politics',
    format: 'VO+BITE',
    location: 'Bengaluru',
    date: '2025-06-10',
    source: 'Reporter Hub',
    content: 'Chief Minister to address key issues regarding the new infrastructure bill.',
    rawScript: 'Chief Minister to address key issues regarding the new infrastructure bill.',
    polishedScript: 'The Chief Minister has just concluded a high-stakes press conference in Bengaluru.',
    anchorScript: 'The Chief Minister has just concluded a high-stakes press conference in Bengaluru.',
    voiceoverScript: 'Visuals show the CM arriving at Vidhana Soudha and speaking to reporters.',
    editorialNotes: 'Urgent coverage requested.',
    notes: 'Urgent coverage requested.',
    priority: 'urgent',
    status: 'SUBMITTED',
    createdBy: 'Admin',
    assignedTo: null,
    createdAt: yesterday,
    updatedAt: now,
    plannedDuration: '00:02:30',
    isPolished: true,
    polishedBy: 'USR-002',
    polishedAt: now,
    isScriptEdited: true,
    editedScript: 'The Chief Minister has just concluded a high-stakes press conference in Bengaluru.',
  },
  {
    storyId: 'STY-20250610-002',
    id: 'STY-20250610-002',
    title: 'ದಕ್ಷಿಣ ಕನ್ನಡ ಪ್ರವಾಹ',
    slug: 'dk-floods-update',
    category: 'National',
    format: 'PKG',
    location: 'Mangaluru',
    date: '2025-06-10',
    source: 'Stringer',
    content: 'Continuous rainfall leads to flooding in several parts of Dakshina Kannada.',
    rawScript: 'Continuous rainfall leads to flooding in several parts of Dakshina Kannada.',
    polishedScript: null,
    anchorScript: '',
    voiceoverScript: '',
    editorialNotes: 'Keep updating visuals.',
    notes: 'Keep updating visuals.',
    priority: 'breaking',
    status: 'EDITING',
    createdBy: 'Reporter1',
    assignedTo: 'Rahul M',
    createdAt: yesterday,
    updatedAt: now,
    plannedDuration: '00:03:00',
    isPolished: false,
    polishedBy: null,
    polishedAt: null,
    isScriptEdited: false,
    editedScript: '',
  },
];

export const MOCK_CLIPS: Clip[] = [
  {
    clipId: 'CLP-001',
    id: 'CLP-001',
    storyId: 'STY-20250610-001',
    fileName: 'STY-20250610-001_C01_RAW.mxf',
    originalFileName: 'interview_take1.mxf',
    fileUrl: '/videos/sample.mp4',
    displayLabel: 'Interview Take 1',
    status: 'APPROVED',
    editingInstructions: 'Cut the first 5 seconds.',
    editorialNotes: 'Good audio quality.',
    claimedBy: 'Rahul M',
    duration: '00:00:45',
    createdAt: yesterday,
    updatedAt: now,
    codec: 'XDCAM HD 50',
    resolution: '1920x1080',
  },
];

export const MOCK_RUNDOWNS: Rundown[] = [
  {
    rundownId: 'RD-20250610-001',
    id: 'RD-20250610-001',
    title: '7:00 PM Primetime News',
    airDate: '2025-06-10',
    date: '2025-06-10',
    airTime: '19:00:00',
    broadcastTime: '19:00:00',
    plannedDuration: '00:30:00',
    status: 'READY',
    entries: [
      {
        entryId: 'RE-1',
        id: 'RE-1',
        rundownId: 'RD-20250610-001',
        storyId: 'SYS-HEADLINES',
        orderIndex: 0,
        overrideDuration: '00:00:15',
        entryStatus: 'READY',
        notes: '',
      },
    ],
  },
];

export const seedStories = MOCK_STORIES;
export const seedClips = MOCK_CLIPS;
export const seedRundowns = MOCK_RUNDOWNS;
export const seedRundownEntries: RundownEntry[] = [];
export const seedUsers = MOCK_USERS;
