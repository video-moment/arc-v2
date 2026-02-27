import { EventEmitter } from 'node:events';
import type { ChatMessage, ChatSession, WsEventType } from '../types.js';

export interface BusEvent {
  type: WsEventType;
  payload: unknown;
}

/**
 * Internal event bus for broadcasting real-time events.
 * WebSocket handler subscribes to this.
 */
export class MessageBus extends EventEmitter {
  emitChatMessage(message: ChatMessage): void {
    this.emit('event', {
      type: 'chat_message' as WsEventType,
      payload: message,
    } satisfies BusEvent);
  }

  emitSessionCreated(session: ChatSession): void {
    this.emit('event', {
      type: 'session_created' as WsEventType,
      payload: session,
    } satisfies BusEvent);
  }

  emitSessionUpdated(session: ChatSession): void {
    this.emit('event', {
      type: 'session_updated' as WsEventType,
      payload: session,
    } satisfies BusEvent);
  }

  emitAgentChunk(sessionId: string, chunk: string): void {
    this.emit('event', {
      type: 'agent_chunk' as WsEventType,
      payload: { sessionId, chunk },
    } satisfies BusEvent);
  }

  emitAgentTyping(sessionId: string): void {
    this.emit('event', {
      type: 'agent_typing' as WsEventType,
      payload: { sessionId },
    } satisfies BusEvent);
  }

  emitAgentDone(sessionId: string): void {
    this.emit('event', {
      type: 'agent_done' as WsEventType,
      payload: { sessionId },
    } satisfies BusEvent);
  }

  emitError(sessionId: string, error: string): void {
    this.emit('event', {
      type: 'error' as WsEventType,
      payload: { sessionId, error },
    } satisfies BusEvent);
  }
}
