import { NextRequest } from 'next/server';
import { eventBus, CHANNELS } from '@/lib/event-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channels = searchParams.get('channels')?.split(',') || Object.values(CHANNELS);

  const encoder = new TextEncoder();
  let unsubscribers: (() => void)[] = [];
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const connectMsg = `data: ${JSON.stringify({ type: 'connected', channels })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      for (const channel of channels) {
        const unsub = eventBus.subscribe(channel, (event) => {
          if (closed) return;
          try {
            const msg = `event: ${channel}\ndata: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(msg));
          } catch {
            // Client disconnected
          }
        });
        unsubscribers.push(unsub);
      }

      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribers.forEach((unsub) => unsub());
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      closed = true;
      unsubscribers.forEach((unsub) => unsub());
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
