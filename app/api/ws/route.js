// File: app/api/ws/route.js
import { NextResponse } from 'next/server';
import { WebSocketServer } from 'ws';

let wss;

export async function GET(request) {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
  }
  return new NextResponse('WebSocket endpoint ready', { status: 200 });
}

/** Broadcast a dashboard update to all WS clients */
export function broadcastDashboardUpdateWS(payload = {}) {
  if (!wss) return;
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  });
}
