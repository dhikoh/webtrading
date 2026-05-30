import { NextResponse } from 'next/server';
import tradeEvents, { EVENTS } from '@/utils/events';
import { getAuthUser } from '@/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmed packet
        controller.enqueue(encoder.encode("data: " + JSON.stringify({ status: "CONNECTED" }) + "\n\n"));

        // Callback event listener
        const onSignalCreated = (data) => {
          // Verify user tenant isolation
          if (data.analysis.tenantId === authUser.tenantId) {
            const message = {
              type: 'SIGNAL',
              data: data.analysis
            };
            controller.enqueue(encoder.encode("data: " + JSON.stringify(message) + "\n\n"));
          }
        };

        // Bind events
        tradeEvents.on(EVENTS.SIGNAL_CREATED, onSignalCreated);

        // Keep-alive heartbeat interval (30 seconds)
        const intervalId = setInterval(() => {
          try {
            controller.enqueue(encoder.encode("data: {\"heartbeat\":true}\n\n"));
          } catch (e) {
            // Stream already closed, clear safely
            clearInterval(intervalId);
          }
        }, 30000);

        // Abort cleanup event
        req.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          tradeEvents.off(EVENTS.SIGNAL_CREATED, onSignalCreated);
          console.log(`User ${authUser.userId} closed SSE session`);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Encoding': 'none'
      }
    });
  } catch (error) {
    console.error("SSE stream route error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
