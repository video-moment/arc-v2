-- pomo_goals에 project_id FK 추가
ALTER TABLE pomo_goals
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES pomo_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pomo_goals_project_id ON pomo_goals(project_id);
