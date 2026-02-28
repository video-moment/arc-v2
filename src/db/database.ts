import Database from 'better-sqlite3';
import type { Agent, AgentStatus, ChatSession, ChatMessage, Squad, Task, TaskStatus } from '../types.js';

export class ArcDatabase {
  private db: Database.Database;

  constructor(dbPath: string = 'data/arc.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'custom',
        telegram_bot_token TEXT,
        telegram_chat_id TEXT,
        status TEXT NOT NULL DEFAULT 'offline',
        last_seen INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_agent ON chat_sessions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at);

      CREATE TABLE IF NOT EXISTS squads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        agent_ids TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        squad_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        assigned_agent_id TEXT,
        result TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (squad_id) REFERENCES squads(id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_squad ON tasks(squad_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `);
  }

  // ── Agents ──
  upsertAgent(agent: Agent): void {
    this.db.prepare(`
      INSERT INTO agents (id, name, description, type, telegram_bot_token, telegram_chat_id, status, last_seen, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        type = excluded.type,
        telegram_bot_token = excluded.telegram_bot_token,
        telegram_chat_id = excluded.telegram_chat_id,
        status = excluded.status,
        last_seen = excluded.last_seen,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(
      agent.id, agent.name, agent.description, agent.type,
      agent.telegramBotToken || null, agent.telegramChatId || null,
      agent.status, agent.lastSeen,
      agent.metadata ? JSON.stringify(agent.metadata) : null,
      agent.createdAt, agent.updatedAt
    );
  }

  getAgent(id: string): Agent | undefined {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.rowToAgent(row);
  }

  listAgents(): Agent[] {
    const rows = this.db.prepare('SELECT * FROM agents ORDER BY name ASC').all() as any[];
    return rows.map(r => this.rowToAgent(r));
  }

  updateAgentStatus(id: string, status: AgentStatus): void {
    this.db.prepare(
      'UPDATE agents SET status = ?, last_seen = ?, updated_at = ? WHERE id = ?'
    ).run(status, Date.now(), Date.now(), id);
  }

  deleteAgent(id: string): boolean {
    const result = this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToAgent(row: any): Agent {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      telegramBotToken: row.telegram_bot_token || undefined,
      telegramChatId: row.telegram_chat_id || undefined,
      status: row.status,
      lastSeen: row.last_seen,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ── Chat Sessions ──
  createSession(session: ChatSession): void {
    this.db.prepare(`
      INSERT INTO chat_sessions (id, agent_id, title, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(session.id, session.agentId, session.title, session.status, session.createdAt, session.updatedAt);
  }

  getSession(id: string): ChatSession | undefined {
    const row = this.db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.rowToSession(row);
  }

  listSessions(agentId?: string): ChatSession[] {
    if (agentId) {
      const rows = this.db.prepare(
        'SELECT * FROM chat_sessions WHERE agent_id = ? ORDER BY updated_at DESC'
      ).all(agentId) as any[];
      return rows.map(r => this.rowToSession(r));
    }
    const rows = this.db.prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC').all() as any[];
    return rows.map(r => this.rowToSession(r));
  }

  updateSession(id: string, updates: Partial<Pick<ChatSession, 'title' | 'status' | 'updatedAt'>>): void {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(updates.updatedAt); }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  private rowToSession(row: any): ChatSession {
    return {
      id: row.id,
      agentId: row.agent_id,
      title: row.title,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ── Chat Messages ──
  saveMessage(message: ChatMessage): void {
    this.db.prepare(`
      INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(message.id, message.sessionId, message.role, message.content, message.createdAt);
  }

  getMessages(sessionId: string): ChatMessage[] {
    const rows = this.db.prepare(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as any[];
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  // ── Squads ──
  createSquad(squad: Squad): void {
    this.db.prepare(`
      INSERT INTO squads (id, name, description, agent_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(squad.id, squad.name, squad.description, JSON.stringify(squad.agentIds), squad.createdAt, squad.updatedAt);
  }

  getSquad(id: string): Squad | undefined {
    const row = this.db.prepare('SELECT * FROM squads WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.rowToSquad(row);
  }

  listSquads(): Squad[] {
    const rows = this.db.prepare('SELECT * FROM squads ORDER BY name ASC').all() as any[];
    return rows.map(r => this.rowToSquad(r));
  }

  updateSquad(id: string, updates: Partial<Pick<Squad, 'name' | 'description' | 'agentIds'>>): void {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.agentIds !== undefined) { fields.push('agent_ids = ?'); values.push(JSON.stringify(updates.agentIds)); }
    fields.push('updated_at = ?'); values.push(Date.now());
    values.push(id);
    this.db.prepare(`UPDATE squads SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteSquad(id: string): boolean {
    const result = this.db.prepare('DELETE FROM squads WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToSquad(row: any): Squad {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      agentIds: JSON.parse(row.agent_ids),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ── Tasks ──
  createTask(task: Task): void {
    this.db.prepare(`
      INSERT INTO tasks (id, squad_id, title, description, status, assigned_agent_id, result, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.squadId, task.title, task.description, task.status,
      task.assignedAgentId || null, task.result || null, task.createdAt, task.updatedAt);
  }

  getTask(id: string): Task | undefined {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.rowToTask(row);
  }

  listTasks(squadId?: string, status?: TaskStatus): Task[] {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: unknown[] = [];
    if (squadId) { query += ' AND squad_id = ?'; params.push(squadId); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(r => this.rowToTask(r));
  }

  updateTask(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedAgentId' | 'result'>>): void {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.assignedAgentId !== undefined) { fields.push('assigned_agent_id = ?'); values.push(updates.assignedAgentId); }
    if (updates.result !== undefined) { fields.push('result = ?'); values.push(updates.result); }
    fields.push('updated_at = ?'); values.push(Date.now());
    values.push(id);
    this.db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteTask(id: string): boolean {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToTask(row: any): Task {
    return {
      id: row.id,
      squadId: row.squad_id,
      title: row.title,
      description: row.description,
      status: row.status,
      assignedAgentId: row.assigned_agent_id || undefined,
      result: row.result || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  close(): void {
    this.db.close();
  }
}
