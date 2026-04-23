import { NextResponse } from 'next/server';
import { prisma } from './prisma';

// ═══════════════════════════════════════
// RESPONSE HELPERS
// ═══════════════════════════════════════

export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function notFoundResponse(entity: string, id: string) {
  return NextResponse.json(
    { error: `${entity} not found: ${id}` },
    { status: 404 }
  );
}

export function conflictResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

// ═══════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════

export async function createAuditLog(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue ?? undefined,
        newValue: params.newValue ?? undefined,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (e) {
    console.error('Audit log failed:', e);
    // Don't throw — audit failure shouldn't break the request
  }
}

// ═══════════════════════════════════════
// ID GENERATORS
// ═══════════════════════════════════════

export function generateStoryId(language: string = 'en'): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 900 + 100);
  const lang = language === 'kn' ? 'KN' : 'EN';
  return `STY-${dateStr}-${random}`;
}

export function generateClipId(storyId: string, clipIndex: number): string {
  const padded = String(clipIndex).padStart(2, '0');
  return `${storyId}_C${padded}`;
}

export function generateClipFileName(clipId: string): string {
  return `${clipId}_RAW.mxf`;
}

export function generateRundownId(): string {
  return `RD-${Date.now().toString(36).toUpperCase()}`;
}

export function generateEntryId(): string {
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ENT-${Date.now().toString(36).toUpperCase()}-${random}`;
}

export function generateCgItemId() {
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CG-${Date.now().toString(36).toUpperCase()}-${random}`;
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
