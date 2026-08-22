// File: app/api/stream/route.js
import { NextResponse } from 'next/server';

// Store connected clients in memory (simple implementation)
const clients = new Set();

export async function GET(request) {
  const accept = request.headers.get('accept');
  if (!accept?.includes('text/event-stream')) {
    return new NextResponse('Expected Accept: text/event-stream', { status: 400 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const id = Date.now();
  clients.add(writer);

  // Send an initial comment to keep connection alive
  writer.write(new TextEncoder().encode(`: connected ${id}\n\n`));

  // Cleanup when client disconnects
  request.signal.addEventListener('abort', () => {
    clients.delete(writer);
    writer.close();
  });

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
    status: 200,
  });
}

/** Broadcast a dashboard update to all SSE clients */
export function broadcastDashboardUpdate(payload = {}) {
  const data = JSON.stringify(payload);
  const msg = `event: dashboardUpdate\ndata: ${data}\n\n`;
  const encoded = new TextEncoder().encode(msg);
  for (const client of clients) {
    try {
      client.write(encoded);
    } catch (_) {
      // Remove broken connections
      clients.delete(client);
    }
  }
}
