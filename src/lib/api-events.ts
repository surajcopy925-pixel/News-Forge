import { publishEvent, CHANNELS, EventType } from './event-bus';

export function emitStoryEvent(type: EventType, storyId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.STORIES, type, storyId, data, userId);
}

export function emitClipEvent(type: EventType, clipId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.CLIPS, type, clipId, data, userId);
}

export function emitRundownEvent(type: EventType, rundownId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.RUNDOWNS, type, rundownId, data, userId);
}

export function emitEntryEvent(type: EventType, entryId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.ENTRIES, type, entryId, data, userId);
}

export function emitCgEvent(type: EventType, cgItemId: string, data?: any, userId?: string) {
  publishEvent(CHANNELS.CG, type, cgItemId, data, userId);
}
