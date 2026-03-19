CREATE TABLE IF NOT EXISTS pomo_episodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid NOT NULL REFERENCES pomo_goals(id) ON DELETE CASCADE,
  title text,
  episode_number integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pomo_episodes_goal_id ON pomo_episodes(goal_id);
