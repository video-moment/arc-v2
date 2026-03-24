-- Add category field to pomo_goals
ALTER TABLE pomo_goals
  ADD COLUMN IF NOT EXISTS category text;
