'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseSSEOptions {
  channels?: string[];
  enabled?: boolean;
}

export function useSSE(options: UseSSEOptions = {}) {
  const { channels = ['stories', 'clips', 'rundowns', 'entries'], enabled = true } = options;
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let retryCount = 0;
    const maxRetries = 10;
    const baseDelay = 1000;

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const params = new URLSearchParams({ channels: channels.join(',') });
      const es = new EventSource(`/api/events?${params}`);
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('[SSE] Connected');
        retryCount = 0;
      };

      for (const channel of channels) {
        es.addEventListener(channel, (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log(`[SSE] ${channel}:`, data.type, data.entityId);

            switch (channel) {
              case 'stories':
                queryClient.invalidateQueries({ queryKey: ['stories'] });
                if (data.entityId) {
                  queryClient.invalidateQueries({ queryKey: ['story', data.entityId] });
                  queryClient.invalidateQueries({ queryKey: ['storyClips', data.entityId] });
                }
                break;

              case 'clips':
                queryClient.invalidateQueries({ queryKey: ['clips'] });
                if (data.entityId) {
                  queryClient.invalidateQueries({ queryKey: ['clip', data.entityId] });
                }
                if (data.data?.storyId) {
                  queryClient.invalidateQueries({ queryKey: ['storyClips', data.data.storyId] });
                }
                break;

              case 'rundowns':
                queryClient.invalidateQueries({ queryKey: ['rundowns'] });
                if (data.entityId) {
                  queryClient.invalidateQueries({ queryKey: ['rundown', data.entityId] });
                }
                break;

              case 'entries':
                queryClient.invalidateQueries({ queryKey: ['rundownEntries'] });
                if (data.data?.rundownId) {
                  queryClient.invalidateQueries({
                    queryKey: ['rundownEntries', data.data.rundownId],
                  });
                }
                break;

              default:
                queryClient.invalidateQueries();
            }
          } catch (err) {
            console.error('[SSE] Parse error:', err);
          }
        });
      }

      es.onerror = () => {
        console.warn('[SSE] Connection error, will retry...');
        es.close();
        eventSourceRef.current = null;

        if (retryCount < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
          retryCount++;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          console.error('[SSE] Max retries reached, giving up');
        }
      };
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, channels.join(','), queryClient]);
}
