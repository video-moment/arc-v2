import Database from 'better-sqlite3';
import type { AgentDef, ChatSession, ChatMessage } from '../types.js';

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
        system_prompt TEXT NOT NULL DEFAULT '',
        model TEXT,
        max_turns INTEGER DEFAULT 10,
        allowed_tools TEXT,
        working_dir TEXT,
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
    `);
  }

  // ── Agents ──
  upsertAgent(agent: AgentDef): void {
    this.db.prepare(`
      INSERT INTO agents (id, name, description, system_prompt, model, max_turns, allowed_tools, working_dir, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        system_prompt = excluded.system_prompt,
        model = excluded.model,
        max_turns = excluded.max_turns,
        allowed_tools = excluded.allowed_tools,
        working_dir = excluded.working_dir,
        updated_at = excluded.updated_at
    `).run(
      agent.id, agent.name, agent.description, agent.systemPrompt,
      agent.model || null, agent.maxTurns || 10,
      agent.allowedTools ? JSON.stringify(agent.allowedTools) : null,
      agent.workingDir || null, agent.createdAt, agent.updatedAt
    );
  }

  getAgent(id: string): AgentDef | undefined {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.rowToAgent(row);
  }

  listAgents(): AgentDef[] {
    const rows = this.db.prepare('SELECT * FROM agents ORDER BY name ASC').all() as any[];
    return rows.map(r => this.rowToAgent(r));
  }

  deleteAgent(id: string): boolean {
    const result = this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToAgent(row: any): AgentDef {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      systemPrompt: row.system_prompt,
      model: row.model || undefined,
      maxTurns: row.max_turns,
      allowedTools: row.allowed_tools ? JSON.parse(row.allowed_tools) : undefined,
      workingDir: row.working_dir || undefined,
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

  close(): void {
    this.db.close();
  }
}
