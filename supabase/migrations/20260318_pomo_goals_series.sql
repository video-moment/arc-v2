-- pomo_goals에 시리즈형 목표 지원 컬럼 추가
ALTER TABLE pomo_goals
  ADD COLUMN IF NOT EXISTS goal_type text NOT NULL DEFAULT 'achievement',
  ADD COLUMN IF NOT EXISTS episode_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS episode_target text,
  ADD COLUMN IF NOT EXISTS last_episode_at timestamptz;
