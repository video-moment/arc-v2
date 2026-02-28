import { v4 as uuid } from 'uuid';
import type { ArcDatabase } from '../db/database.js';
import type { ChatSession, ChatMessage } from '../types.js';
import { MessageBus } from './message-bus.js';

/**
 * Monitor — session/message management + event broadcasting.
 * No agent execution. External agents push messages via MCP or API.
 */
export class Monitor {
  private db: ArcDatabase;
  readonly bus: MessageBus;

  constructor(db: ArcDatabase) {
    this.db = db;
    this.bus = new MessageBus();
  }

  createSession(agentId: string, title?: string): ChatSession {
    const now = Date.now();
    const session: ChatSession = {
      id: uuid(),
      agentId,
      title: title || 'New Chat',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.db.createSession(session);
    this.bus.emitSessionCreated(session);
    return session;
  }

  getSession(id: string): ChatSession | undefined {
    return this.db.getSession(id);
  }

  listSessions(agentId?: string): ChatSession[] {
    return this.db.listSessions(agentId);
  }

  updateSession(id: string, updates: Partial<Pick<ChatSession, 'title' | 'status'>>): ChatSession | undefined {
    const session = this.db.getSession(id);
    if (!session) return undefined;
    this.db.updateSession(id, { ...updates, updatedAt: Date.now() });
    const updated = this.db.getSession(id)!;
    this.bus.emitSessionUpdated(updated);
    return updated;
  }

  getMessages(sessionId: string): ChatMessage[] {
    return this.db.getMessages(sessionId);
  }

  /** Receive a message from any source (MCP, telegram webhook, app) and store + broadcast */
  receiveMessage(sessionId: string, role: string, content: string): ChatMessage {
    const message: ChatMessage = {
      id: uuid(),
      sessionId,
      role,
      content,
      createdAt: Date.now(),
    };
    this.db.saveMessage(message);
    this.bus.emitChatMessage(message);

    // Update session title from first message
    const session = this.db.getSession(sessionId);
    if (session && session.title === 'New Chat') {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      this.db.updateSession(sessionId, { title, updatedAt: Date.now() });
    }

    return message;
  }
}
