import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import type { ChatManager } from '../communication/chat-manager.js';
import type { BusEvent } from '../communication/message-bus.js';
import type { ChatMessage, WsEvent } from '../types.js';

export function setupWebSocket(server: Server, chatManager: ChatManager): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Track clients by session
  const sessionClients = new Map<string, Set<WebSocket>>();
  const clientSessions = new Map<WebSocket, Set<string>>();

  wss.on('connection', (ws: WebSocket) => {
    clientSessions.set(ws, new Set());

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'subscribe' && msg.sessionId) {
          const sid = msg.sessionId as string;

          if (!sessionClients.has(sid)) {
            sessionClients.set(sid, new Set());
          }
          sessionClients.get(sid)!.add(ws);
          clientSessions.get(ws)!.add(sid);

          // Catch-up: send existing messages
          const messages = chatManager.getMessages(sid);
          for (const message of messages) {
            const event: WsEvent = { type: 'chat_message', payload: message };
            ws.send(JSON.stringify(event));
          }
        }

        if (msg.type === 'unsubscribe' && msg.sessionId) {
          const sid = msg.sessionId as string;
          sessionClients.get(sid)?.delete(ws);
          clientSessions.get(ws)?.delete(sid);
        }
      } catch {
        // Ignore invalid messages
      }
    });

    ws.on('close', () => {
      const sessions = clientSessions.get(ws);
      if (sessions) {
        for (const sid of sessions) {
          sessionClients.get(sid)?.delete(ws);
        }
      }
      clientSessions.delete(ws);
    });
  });

  // Listen to message bus events and broadcast
  chatManager.bus.on('event', (busEvent: BusEvent) => {
    const payload = busEvent.payload as any;
    const sessionId = payload?.sessionId || payload?.id;
    if (!sessionId) return;

    const wsEvent: WsEvent = { type: busEvent.type, payload: busEvent.payload };
    broadcast(sessionClients, sessionId, wsEvent);
  });

  return wss;
}

function broadcast(
  clients: Map<string, Set<WebSocket>>,
  sessionId: string,
  event: WsEvent
): void {
  const data = JSON.stringify(event);

  // Session-specific subscribers
  const sockets = clients.get(sessionId);
  if (sockets) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  // Wildcard subscribers
  const allSockets = clients.get('*');
  if (allSockets) {
    for (const ws of allSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}
