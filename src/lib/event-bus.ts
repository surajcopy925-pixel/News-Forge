type EventCallback = (data: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  subscribe(channel: string, callback: EventCallback): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    return () => {
      this.listeners.get(channel)?.delete(callback);
      if (this.listeners.get(channel)?.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  publish(channel: string, data: any): void {
    const callbacks = this.listeners.get(channel);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[event-bus] Error in listener for ${channel}:`, err);
        }
      });
    }
    const wildcardCallbacks = this.listeners.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach((cb) => {
        try {
          cb({ channel, ...data });
        } catch (err) {
          console.error(`[event-bus] Error in wildcard listener:`, err);
        }
      });
    }
  }
}

const globalForEventBus = globalThis as unknown as { eventBus: EventBus };
export const eventBus = globalForEventBus.eventBus || new EventBus();
if (process.env.NODE_ENV !== 'production') {
  globalForEventBus.eventBus = eventBus;
}

export const CHANNELS = {
  STORIES: 'stories',
  CLIPS: 'clips',
  RUNDOWNS: 'rundowns',
  ENTRIES: 'entries',
  PLAYOUT: 'playout',
  CG: 'cg',
} as const;

export type EventType = 'created' | 'updated' | 'deleted' | 'reordered';

export interface SSEEvent {
  type: EventType;
  entity: string;
  entityId?: string;
  data?: any;
  userId?: string;
  timestamp: string;
}

export function publishEvent(
  channel: string,
  type: EventType,
  entityId?: string,
  data?: any,
  userId?: string
): void {
  const event: SSEEvent = {
    type,
    entity: channel,
    entityId,
    data,
    userId,
    timestamp: new Date().toISOString(),
  };
  eventBus.publish(channel, event);
}
