-- Migration: Enhance pomo_tasks and pomo_goals
-- All statements use IF NOT EXISTS for idempotency (safe to re-run)

-- ── pomo_tasks: 반복 할일 ──
ALTER TABLE pomo_tasks ADD COLUMN IF NOT EXISTS recurrence text DEFAULT NULL;
-- recurrence values: 'daily', 'weekly', 'monthly', NULL (one-time)

ALTER TABLE pomo_tasks ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid DEFAULT NULL;
-- if this task was auto-generated from a recurring task, references the original

-- ── pomo_tasks: 의존성 ──
ALTER TABLE pomo_tasks ADD COLUMN IF NOT EXISTS blocked_by uuid DEFAULT NULL REFERENCES pomo_tasks(id) ON DELETE SET NULL;

-- ── pomo_tasks: 시간 추정/기록 ──
ALTER TABLE pomo_tasks ADD COLUMN IF NOT EXISTS estimated_minutes int DEFAULT NULL;
ALTER TABLE pomo_tasks ADD COLUMN IF NOT EXISTS actual_minutes int DEFAULT NULL;

-- ── pomo_tasks: 메모 ──
ALTER TABLE pomo_tasks ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- ── pomo_goals: on_hold 상태 지원 ──
ALTER TABLE pomo_goals ADD COLUMN IF NOT EXISTS paused_at timestamptz DEFAULT NULL;
