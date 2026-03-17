-- 1. pomo_goals 테이블 생성
CREATE TABLE IF NOT EXISTS pomo_goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'archived')),
  priority        text NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('high', 'medium', 'low')),
  target_date     date,
  target_pomodoros integer,
  color           text NOT NULL DEFAULT '#6366f1',
  sort_order      integer NOT NULL DEFAULT 0,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. pomo_tasks에 컬럼 추가
ALTER TABLE pomo_tasks
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES pomo_goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_type text NOT NULL DEFAULT 'me',
  ADD COLUMN IF NOT EXISTS assignee_agent_id text;

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_pomo_tasks_goal_id ON pomo_tasks(goal_id);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pomo_goals_updated_at ON pomo_goals;
CREATE TRIGGER pomo_goals_updated_at
  BEFORE UPDATE ON pomo_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
