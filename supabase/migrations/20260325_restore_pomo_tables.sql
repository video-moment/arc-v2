-- ═══════════════════════════════════════
-- pomo_* 테이블 복구 (IF NOT EXISTS로 안전하게)
-- ═══════════════════════════════════════

-- 1. pomo_projects
CREATE TABLE IF NOT EXISTS pomo_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📁',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. pomo_subprojects
CREATE TABLE IF NOT EXISTS pomo_subprojects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES pomo_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8b5cf6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. pomo_goals (must exist before pomo_tasks references it)
CREATE TABLE IF NOT EXISTS pomo_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  target_date DATE,
  target_pomodoros INTEGER,
  color TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- series goal columns
  goal_type TEXT NOT NULL DEFAULT 'achievement',
  episode_count INTEGER NOT NULL DEFAULT 0,
  episode_target TEXT,
  last_episode_at TIMESTAMPTZ,
  -- project FK
  project_id UUID REFERENCES pomo_projects(id) ON DELETE SET NULL,
  -- category
  category TEXT
);

-- 4. pomo_tasks
CREATE TABLE IF NOT EXISTS pomo_tasks (
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- goal & assignee columns
  goal_id UUID REFERENCES pomo_goals(id) ON DELETE SET NULL,
  assignee_type TEXT NOT NULL DEFAULT 'me',
  assignee_agent_id TEXT
);

-- 5. pomo_sessions
CREATE TABLE IF NOT EXISTS pomo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES pomo_tasks(id) ON DELETE CASCADE,
  duration_minutes INTEGER DEFAULT 25,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false
);

-- 6. pomo_goal_milestones
CREATE TABLE IF NOT EXISTS pomo_goal_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES pomo_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. pomo_episodes
CREATE TABLE IF NOT EXISTS pomo_episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES pomo_goals(id) ON DELETE CASCADE,
  title TEXT,
  episode_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. pomo_task_comments
CREATE TABLE IF NOT EXISTS pomo_task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES pomo_tasks(id) ON DELETE CASCADE,
  agent_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_pomo_subprojects_project ON pomo_subprojects(project_id);
CREATE INDEX IF NOT EXISTS idx_pomo_tasks_project ON pomo_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pomo_tasks_subproject ON pomo_tasks(subproject_id);
CREATE INDEX IF NOT EXISTS idx_pomo_tasks_status ON pomo_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pomo_tasks_goal_id ON pomo_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_pomo_sessions_task ON pomo_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_pomo_sessions_started ON pomo_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_pomo_goals_project_id ON pomo_goals(project_id);
CREATE INDEX IF NOT EXISTS idx_pomo_goal_milestones_goal_id ON pomo_goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_pomo_episodes_goal_id ON pomo_episodes(goal_id);
CREATE INDEX IF NOT EXISTS idx_pomo_task_comments_task_id ON pomo_task_comments(task_id);

-- ═══════════════════════════════════════
-- RLS (anon 전체 허용)
-- ═══════════════════════════════════════

ALTER TABLE pomo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_subprojects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_task_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomo_projects' AND policyname = 'Allow all on pomo_projects') THEN
    CREATE POLICY "Allow all on pomo_projects" ON pomo_projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomo_subprojects' AND policyname = 'Allow all on pomo_subprojects') THEN
    CREATE POLICY "Allow all on pomo_subprojects" ON pomo_subprojects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomo_tasks' AND policyname = 'Allow all on pomo_tasks') THEN
    CREATE POLICY "Allow all on pomo_tasks" ON pomo_tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomo_sessions' AND policyname = 'Allow all on pomo_sessions') THEN
    CREATE POLICY "Allow all on pomo_sessions" ON pomo_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomo_goals' AND policyname = 'Allow all on pomo_goals') THEN
    CREATE POLICY "Allow all on pomo_goals" ON pomo_goals FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomo_goal_milestones' AND policyname = 'Allow all on pomo_goal_milestones') THEN
    CREATE POLICY "Allow all on pomo_goal_milestones" ON pomo_goal_milestones FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomo_episodes' AND policyname = 'Allow all on pomo_episodes') THEN
    CREATE POLICY "Allow all on pomo_episodes" ON pomo_episodes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomo_task_comments' AND policyname = 'Allow all on pomo_task_comments') THEN
    CREATE POLICY "Allow all on pomo_task_comments" ON pomo_task_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════
-- updated_at 트리거
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pomo_projects_updated ON pomo_projects;
CREATE TRIGGER pomo_projects_updated BEFORE UPDATE ON pomo_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS pomo_subprojects_updated ON pomo_subprojects;
CREATE TRIGGER pomo_subprojects_updated BEFORE UPDATE ON pomo_subprojects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS pomo_tasks_updated ON pomo_tasks;
CREATE TRIGGER pomo_tasks_updated BEFORE UPDATE ON pomo_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS pomo_goals_updated_at ON pomo_goals;
CREATE TRIGGER pomo_goals_updated_at BEFORE UPDATE ON pomo_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
