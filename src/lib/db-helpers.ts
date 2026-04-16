import type {
  Story as PrismaStory,
  StoryClip as PrismaClip,
  Rundown as PrismaRundown,
  RundownEntry as PrismaEntry,
  User as PrismaUser,
  CgItem as PrismaCgItem,
} from '@prisma/client';

// ═══════════════════════════════════════
// STORY FORMAT: Prisma ↔ Frontend
// ═══════════════════════════════════════
const FORMAT_TO_FRONTEND: Record<string, string> = {
  PKG: 'PKG',
  VO: 'VO',
  VO_BITE: 'VO+BITE',
  ANCHOR: 'ANCHOR',
  BREAK: 'BREAK',
  LIVE: 'LIVE',
  GFX: 'GFX',
  EMPTY: '',
};

const FORMAT_TO_PRISMA: Record<string, string> = {
  PKG: 'PKG',
  VO: 'VO',
  'VO+BITE': 'VO_BITE',
  ANCHOR: 'ANCHOR',
  BREAK: 'BREAK',
  LIVE: 'LIVE',
  GFX: 'GFX',
  '': 'EMPTY',
};

// ═══════════════════════════════════════
// STORY STATUS: Prisma ↔ Frontend
// ═══════════════════════════════════════
const STATUS_TO_FRONTEND: Record<string, string> = {
  NOT_READY: 'NOT READY',
  EDITING: 'EDITING',
  READY: 'READY',
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  SUBMITTED: 'SUBMITTED',
};

const STATUS_TO_PRISMA: Record<string, string> = {
  'NOT READY': 'NOT_READY',
  EDITING: 'EDITING',
  READY: 'READY',
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  SUBMITTED: 'SUBMITTED',
};

// ═══════════════════════════════════════
// ROLE: Prisma ↔ Frontend
// ═══════════════════════════════════════
const ROLE_TO_FRONTEND: Record<string, string> = {
  REPORTER: 'REPORTER',
  EDITOR: 'EDITOR',
  COPY_EDITOR: 'COPY_EDITOR',
  PRODUCER: 'PRODUCER',
  ADMIN: 'ADMIN',
};

// ═══════════════════════════════════════
// CONVERTERS: Prisma → Frontend
// ═══════════════════════════════════════

export function toFrontendStory(s: PrismaStory) {
  return {
    storyId: s.storyId,
    title: s.title,
    slug: s.slug,
    format: (FORMAT_TO_FRONTEND[s.format] ?? '') as any,
    status: (STATUS_TO_FRONTEND[s.status] ?? 'DRAFT') as any,
    _count: (s as any)._count,

    content: s.content,
    rawScript: s.rawScript,
    polishedScript: s.polishedScript,
    anchorScript: s.anchorScript,
    voiceoverScript: s.voiceoverScript,
    editorialNotes: s.editorialNotes,

    scriptSentToRundown: s.scriptSentToRundown,
    sentToRundownId: s.sentToRundownId,
    sentToRundownAt: s.sentToRundownAt?.toISOString() ?? null,
    sentBy: s.sentBy,

    polishedBy: s.polishedBy,
    polishedAt: s.polishedAt?.toISOString() ?? null,
    isPolished: s.isPolished,

    createdBy: s.createdBy,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    plannedDuration: s.plannedDuration,
    rundownId: s.rundownId,
    orderIndex: s.orderIndex,

    category: s.category ?? undefined,
    location: s.location ?? undefined,
    source: s.source ?? undefined,
    language: (s.language ?? 'en') as 'en' | 'kn',
    priority: (s.priority ?? 'NORMAL') as 'URGENT' | 'NORMAL' | 'LOW',
  };
}

export function toFrontendClip(c: PrismaClip) {
  return {
    clipId: c.clipId,
    storyId: c.storyId,
    fileName: c.fileName,
    originalFileName: c.originalFileName,
    fileUrl: c.fileUrl,
    fileType: c.fileType,
    displayLabel: c.displayLabel,
    duration: c.duration,
    status: c.status as 'PENDING' | 'EDITING' | 'DONE',
    claimedBy: c.claimedBy,
    claimedAt: c.claimedAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
    editingInstructions: c.editingInstructions,
    editorialNotes: c.editorialNotes,
  };
}

export function toFrontendRundown(r: PrismaRundown) {
  return {
    rundownId: r.rundownId,
    title: r.title,
    date: r.date,
    broadcastTime: r.broadcastTime,
    plannedDuration: r.plannedDuration,
    status: r.status as any,
    mosStatus: r.mosStatus as 'SYNCED' | 'OFFLINE',
    createdAt: r.createdAt.toISOString(),
  };
}

export function toFrontendEntry(e: PrismaEntry) {
  return {
    entryId: e.entryId,
    rundownId: e.rundownId,
    storyId: e.storyId,
    orderIndex: e.orderIndex,
    scriptContent: e.scriptContent,
    scriptSource: e.scriptSource as 'POLISHED' | 'RAW' | null,
  };
}

export function toFrontendUser(u: PrismaUser) {
  return {
    userId: u.userId,
    fullName: u.fullName,
    role: (ROLE_TO_FRONTEND[u.role] ?? 'REPORTER') as any,
    email: u.email,
  };
}

// ═══════════════════════════════════════
// CONVERTERS: Frontend → Prisma
// ═══════════════════════════════════════

export function toPrismaFormat(format: string): string {
  return FORMAT_TO_PRISMA[format] ?? 'EMPTY';
}

export function toPrismaStatus(status: string): string {
  return STATUS_TO_PRISMA[status] ?? 'DRAFT';
}

export function toCgItemFrontend(c: PrismaCgItem) {
  return {
    ...c,
    fieldData: c.fieldData as Record<string, unknown>,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
