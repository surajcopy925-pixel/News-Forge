import { publishEvent, CHANNELS, SSEEventType } from './event-bus';

export function emitStoryEvent(type: SSEEventType, storyId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.STORIES, type, storyId, data, userId);
}

export function emitClipEvent(type: SSEEventType, clipId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.CLIPS, type, clipId, data, userId);
}

export function emitRundownEvent(type: SSEEventType, rundownId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.RUNDOWNS, type, rundownId, data, userId);
}

export function emitEntryEvent(type: SSEEventType, entryId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.ENTRIES, type, entryId, data, userId);
}

export function emitCgEvent(type: SSEEventType, cgItemId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.CG, type, cgItemId, data, userId);
}
