import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArcDatabase } from '../src/db/database.js';
import { unlinkSync } from 'node:fs';

const TEST_DB = './data/test.db';

describe('ArcDatabase', () => {
  let db: ArcDatabase;

  beforeEach(() => {
    db = new ArcDatabase(TEST_DB);
  });

  afterEach(() => {
    db.close();
    try { unlinkSync(TEST_DB); } catch {}
    try { unlinkSync(TEST_DB + '-wal'); } catch {}
    try { unlinkSync(TEST_DB + '-shm'); } catch {}
  });

  describe('agents', () => {
    const agent = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      type: 'telegram' as const,
      telegramBotToken: 'tok_123',
      telegramChatId: '456',
      status: 'offline' as const,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('upserts and retrieves an agent', () => {
      db.upsertAgent(agent);
      const found = db.getAgent('test-agent');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Test Agent');
      expect(found!.type).toBe('telegram');
      expect(found!.telegramBotToken).toBe('tok_123');
      expect(found!.status).toBe('offline');
    });

    it('lists agents', () => {
      db.upsertAgent(agent);
      db.upsertAgent({ ...agent, id: 'agent-2', name: 'Agent 2' });
      const list = db.listAgents();
      expect(list).toHaveLength(2);
    });

    it('updates agent status', () => {
      db.upsertAgent(agent);
      db.updateAgentStatus('test-agent', 'online');
      const found = db.getAgent('test-agent');
      expect(found!.status).toBe('online');
    });

    it('updates an agent on upsert', () => {
      db.upsertAgent(agent);
      db.upsertAgent({ ...agent, name: 'Updated', updatedAt: Date.now() + 1000 });
      const found = db.getAgent('test-agent');
      expect(found!.name).toBe('Updated');
    });

    it('deletes an agent', () => {
      db.upsertAgent(agent);
      expect(db.deleteAgent('test-agent')).toBe(true);
      expect(db.getAgent('test-agent')).toBeUndefined();
    });

    it('returns false when deleting non-existent agent', () => {
      expect(db.deleteAgent('nope')).toBe(false);
    });
  });

  describe('sessions', () => {
    const agent = {
      id: 'a1', name: 'A', description: '', type: 'custom' as const,
      status: 'offline' as const, lastSeen: Date.now(),
      createdAt: Date.now(), updatedAt: Date.now(),
    };

    const session = {
      id: 'sess-1',
      agentId: 'a1',
      title: 'New Chat',
      status: 'active' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    beforeEach(() => {
      db.upsertAgent(agent);
    });

    it('creates and retrieves a session', () => {
      db.createSession(session);
      const found = db.getSession('sess-1');
      expect(found).toBeDefined();
      expect(found!.agentId).toBe('a1');
    });

    it('lists sessions by agentId', () => {
      db.createSession(session);
      db.createSession({ ...session, id: 'sess-2' });
      expect(db.listSessions('a1')).toHaveLength(2);
      expect(db.listSessions('nonexistent')).toHaveLength(0);
    });

    it('updates session fields', () => {
      db.createSession(session);
      db.updateSession('sess-1', { title: 'Updated Title', updatedAt: Date.now() });
      expect(db.getSession('sess-1')!.title).toBe('Updated Title');
    });
  });

  describe('messages', () => {
    beforeEach(() => {
      db.upsertAgent({
        id: 'a1', name: 'A', description: '', type: 'custom',
        status: 'offline', lastSeen: Date.now(),
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      db.createSession({ id: 's1', agentId: 'a1', title: '', status: 'active', createdAt: Date.now(), updatedAt: Date.now() });
    });

    it('saves and retrieves messages in order', () => {
      db.saveMessage({ id: 'm1', sessionId: 's1', role: 'user', content: 'Hello', createdAt: 1000 });
      db.saveMessage({ id: 'm2', sessionId: 's1', role: 'assistant', content: 'Hi', createdAt: 2000 });
      const msgs = db.getMessages('s1');
      expect(msgs).toHaveLength(2);
      expect(msgs[0].role).toBe('user');
      expect(msgs[1].role).toBe('assistant');
    });

    it('supports custom role names', () => {
      db.saveMessage({ id: 'm3', sessionId: 's1', role: 'telegram-bot', content: 'From bot', createdAt: 3000 });
      const msgs = db.getMessages('s1');
      expect(msgs[0].role).toBe('telegram-bot');
    });

    it('returns empty array for unknown session', () => {
      expect(db.getMessages('nope')).toHaveLength(0);
    });
  });
});
