-- ARC V2 Supabase Schema
-- Supabase SQL Editor에서 실행

-- ═══════════════════════════════════════
-- 1. Enum Types
-- ═══════════════════════════════════════

CREATE TYPE agent_type AS ENUM ('telegram', 'discord', 'slack', 'custom');
CREATE TYPE agent_status AS ENUM ('online', 'offline', 'error');
CREATE TYPE session_status AS ENUM ('active', 'archived');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- ═══════════════════════════════════════
-- 2. Tables
-- ═══════════════════════════════════════

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type agent_type NOT NULL DEFAULT 'custom',
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  status agent_status NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  status session_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE squads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  agent_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status task_status NOT NULL DEFAULT 'pending',
  assigned_agent_id TEXT,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════
-- 3. Indexes
-- ═══════════════════════════════════════

CREATE INDEX idx_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX idx_messages_session ON chat_messages(session_id);
CREATE INDEX idx_messages_created ON chat_messages(created_at);
CREATE INDEX idx_tasks_squad ON tasks(squad_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ═══════════════════════════════════════
-- 4. RLS (Row Level Security)
-- 모니터링 도구이므로 anon 키로 전체 접근 허용
-- ═══════════════════════════════════════

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_sessions" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on squads" ON squads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════
-- 5. Realtime 활성화
-- ═══════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;

-- ═══════════════════════════════════════
-- 6. updated_at 자동 갱신 트리거
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER squads_updated_at BEFORE UPDATE ON squads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════
-- 7. 뽀모도로 테이블
-- ═══════════════════════════════════════

CREATE TABLE pomo_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📁',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pomo_subprojects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES pomo_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8b5cf6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pomo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES pomo_projects(id) ON DELETE CASCADE,
  subproject_id UUID REFERENCES pomo_subprojects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  category TEXT,
  estimated_pomodoros INTEGER DEFAULT 1,
  completed_pomodoros INTEGER DEFAULT 0,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pomo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES pomo_tasks(id) ON DELETE CASCADE,
  duration_minutes INTEGER DEFAULT 25,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false
);

CREATE INDEX idx_pomo_subprojects_project ON pomo_subprojects(project_id);
CREATE INDEX idx_pomo_tasks_project ON pomo_tasks(project_id);
CREATE INDEX idx_pomo_tasks_subproject ON pomo_tasks(subproject_id);
CREATE INDEX idx_pomo_tasks_status ON pomo_tasks(status);
CREATE INDEX idx_pomo_sessions_task ON pomo_sessions(task_id);
CREATE INDEX idx_pomo_sessions_started ON pomo_sessions(started_at);

ALTER TABLE pomo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_subprojects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on pomo_projects" ON pomo_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pomo_subprojects" ON pomo_subprojects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pomo_tasks" ON pomo_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pomo_sessions" ON pomo_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER pomo_projects_updated BEFORE UPDATE ON pomo_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pomo_subprojects_updated BEFORE UPDATE ON pomo_subprojects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pomo_tasks_updated BEFORE UPDATE ON pomo_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
