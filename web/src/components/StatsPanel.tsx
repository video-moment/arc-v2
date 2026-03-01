'use client';

import type { PomoSession, PomoTask, PomoProject } from '@/lib/api';
import { TomatoIcon, FlameIcon, ClockIcon } from './Icons';

interface Props {
  sessions: PomoSession[];
  tasks: PomoTask[];
  projects: PomoProject[];
}

const DAILY_GOAL = 8;

export default function StatsPanel({ sessions, tasks, projects }: Props) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const todaySessions = sessions.filter(s => s.completedAt && s.completedAt.startsWith(todayStr));
  const todayPomos = todaySessions.length;
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const streak = (() => {
    let count = 0;
    const d = new Date(now);
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().split('T')[0];
      const hasSessions = sessions.some(s => s.completedAt && s.completedAt.startsWith(dateStr));
      if (i === 0 && !hasSessions) { d.setDate(d.getDate() - 1); continue; }
      if (hasSessions) { count++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return count;
  })();

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = sessions.filter(s => s.completedAt && s.completedAt.startsWith(dateStr)).length;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return { day: dayNames[d.getDay()], count, isToday: dateStr === todayStr };
  });

  const maxWeekCount = Math.max(...weekData.map(d => d.count), 1);

  const projectTimeMap = new Map<string, number>();
  for (const session of sessions) {
    const task = tasks.find(t => t.id === session.taskId);
    if (task?.projectId) {
      const current = projectTimeMap.get(task.projectId) || 0;
      projectTimeMap.set(task.projectId, current + session.durationMinutes);
    }
  }
  const totalProjectMinutes = Array.from(projectTimeMap.values()).reduce((a, b) => a + b, 0) || 1;

  // Goal ring calculations
  const goalProgress = Math.min(todayPomos / DAILY_GOAL, 1);
  const goalRadius = 32;
  const goalCircumference = 2 * Math.PI * goalRadius;
  const goalOffset = goalCircumference * (1 - goalProgress);

  return (
    <div className="flex flex-col gap-6 px-5 py-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
        통계
      </h3>

      {/* Daily goal ring */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{
          background: 'var(--bg-elevated)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div className="relative flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={goalRadius} fill="none" stroke="var(--border-subtle)" strokeWidth="5" opacity="0.5" />
            <circle
              cx="36" cy="36" r={goalRadius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={goalCircumference}
              strokeDashoffset={goalOffset}
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{todayPomos}</span>
            <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>/{DAILY_GOAL}</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>오늘의 목표</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {todayPomos >= DAILY_GOAL
              ? '목표 달성! 수고하셨습니다'
              : (DAILY_GOAL - todayPomos) + '개 남음'}
          </p>
        </div>
      </div>

      {/* Stat cards — vertical layout in grid */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="flex flex-col items-center p-3 rounded-xl text-center"
          style={{ background: 'var(--bg-elevated)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
        >
          <TomatoIcon size={20} />
          <span className="text-xl font-bold mt-1.5" style={{ color: 'var(--accent-hover)' }}>
            {todayPomos}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>뽀모도로</span>
        </div>
        <div
          className="flex flex-col items-center p-3 rounded-xl text-center"
          style={{ background: 'var(--bg-elevated)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
        >
          <ClockIcon size={20} />
          <span className="text-xl font-bold mt-1.5" style={{ color: 'var(--text-primary)' }}>
            {todayMinutes < 60
              ? todayMinutes + '분'
              : Math.floor(todayMinutes / 60) + 'h'}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>집중 시간</span>
        </div>
        <div
          className="flex flex-col items-center p-3 rounded-xl text-center"
          style={{ background: 'var(--bg-elevated)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
        >
          <FlameIcon size={20} />
          <span className="text-xl font-bold mt-1.5" style={{ color: 'var(--green)' }}>
            {streak}일
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>연속 달성</span>
        </div>
      </div>

      {/* Weekly heatmap */}
      <div>
        <p className="text-[11px] font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>주간 활동</p>
        <div className="flex gap-1.5">
          {weekData.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className="w-full aspect-square rounded-lg transition-all flex items-center justify-center"
                style={{
                  background: d.count === 0
                    ? 'var(--bg-elevated)'
                    : `rgba(139, 92, 246, ${0.2 + 0.8 * (d.count / maxWeekCount)})`,
                  border: d.isToday ? '2px solid var(--accent)' : '2px solid transparent',
                  minHeight: '36px',
                }}
                title={d.count + '개 완료'}
              >
                {d.count > 0 && (
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: d.count / maxWeekCount > 0.5 ? '#fff' : 'var(--text-secondary)' }}
                  >
                    {d.count}
                  </span>
                )}
              </div>
              <span
                className="text-[9px] font-medium"
                style={{ color: d.isToday ? 'var(--accent-hover)' : 'var(--text-tertiary)' }}
              >
                {d.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Project time allocation */}
      {projects.length > 0 && projectTimeMap.size > 0 && (
        <div>
          <p className="text-[11px] font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>프로젝트별 투입</p>
          <div className="space-y-3">
            {projects
              .filter(p => projectTimeMap.has(p.id))
              .sort((a, b) => (projectTimeMap.get(b.id) || 0) - (projectTimeMap.get(a.id) || 0))
              .map(p => {
                const mins = projectTimeMap.get(p.id) || 0;
                const pct = Math.round((mins / totalProjectMinutes) * 100);
                return (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {p.name}
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: pct + '%', background: p.color }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
