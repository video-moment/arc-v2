-- pomo_task_comments: 에이전트가 태스크에 남기는 진행 로그 및 완료 보고
-- agents.id는 TEXT 타입이므로 agent_id는 FK 없이 TEXT로 유지

CREATE TABLE IF NOT EXISTS pomo_task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES pomo_tasks(id) ON DELETE CASCADE,
  agent_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pomo_task_comments_task_id ON pomo_task_comments(task_id);
