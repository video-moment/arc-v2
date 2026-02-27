import { v4 as uuid } from 'uuid';
import type { ArcDatabase } from '../db/database.js';
import type { ChatSession, ChatMessage } from '../types.js';
import { MessageBus } from './message-bus.js';
import { AgentRunner } from '../engine/agent-runner.js';
import { buildPrompt } from '../engine/prompt-builder.js';
import type { AgentDef } from '../types.js';

export class ChatManager {
  private db: ArcDatabase;
  readonly bus: MessageBus;
  private runner: AgentRunner;

  constructor(db: ArcDatabase) {
    this.db = db;
    this.bus = new MessageBus();
    this.runner = new AgentRunner();
  }

  /** Create a new chat session */
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

  /** Send a user message and get agent response */
  async sendMessage(sessionId: string, content: string, agent: AgentDef): Promise<ChatMessage> {
    const now = Date.now();

    // Save user message
    const userMsg: ChatMessage = {
      id: uuid(),
      sessionId,
      role: 'user',
      content,
      createdAt: now,
    };
    this.db.saveMessage(userMsg);
    this.bus.emitChatMessage(userMsg);

    // Update session title from first message
    const session = this.db.getSession(sessionId);
    if (session && session.title === 'New Chat') {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      this.db.updateSession(sessionId, { title, updatedAt: now });
    }

    // Run agent
    this.bus.emitAgentTyping(sessionId);

    try {
      const history = this.db.getMessages(sessionId);
      // Exclude the user message we just saved (it's in history now) for prompt building
      const prevHistory = history.slice(0, -1);
      const prompt = buildPrompt(prevHistory, content);

      const result = await this.runner.run(agent, prompt, sessionId);

      const assistantMsg: ChatMessage = {
        id: uuid(),
        sessionId,
        role: 'assistant',
        content: result.output || '(no response)',
        createdAt: Date.now(),
      };
      this.db.saveMessage(assistantMsg);
      this.bus.emitChatMessage(assistantMsg);
      this.bus.emitAgentDone(sessionId);

      // Update session timestamp
      this.db.updateSession(sessionId, { updatedAt: Date.now() });

      return assistantMsg;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.bus.emitError(sessionId, errorMsg);

      const errResponse: ChatMessage = {
        id: uuid(),
        sessionId,
        role: 'assistant',
        content: `Error: ${errorMsg}`,
        createdAt: Date.now(),
      };
      this.db.saveMessage(errResponse);
      this.bus.emitChatMessage(errResponse);
      this.bus.emitAgentDone(sessionId);

      return errResponse;
    }
  }

  stopAgent(sessionId: string): void {
    this.runner.stop(sessionId);
  }
}
