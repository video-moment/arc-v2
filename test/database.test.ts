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
      systemPrompt: 'You are a test.',
      model: 'sonnet',
      maxTurns: 5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('upserts and retrieves an agent', () => {
      db.upsertAgent(agent);
      const found = db.getAgent('test-agent');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Test Agent');
      expect(found!.model).toBe('sonnet');
    });

    it('lists agents', () => {
      db.upsertAgent(agent);
      db.upsertAgent({ ...agent, id: 'agent-2', name: 'Agent 2' });
      const list = db.listAgents();
      expect(list).toHaveLength(2);
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
      id: 'a1', name: 'A', description: '', systemPrompt: '',
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
      db.upsertAgent({ id: 'a1', name: 'A', description: '', systemPrompt: '', createdAt: Date.now(), updatedAt: Date.now() });
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

    it('returns empty array for unknown session', () => {
      expect(db.getMessages('nope')).toHaveLength(0);
    });
  });
});
