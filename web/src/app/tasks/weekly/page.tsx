'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Target, CheckCircle2,
  Flame, TrendingUp, Calendar, Circle,
  Code2, Video, Settings, Palette, BookOpen, MoreHorizontal,
} from 'lucide-react';
import {
  getTasks, getTaskGoals, getTaskProjects, updateTask,
  type Task, type TaskGoal, type TaskProject,
} from '@/lib/api';

// ── Helpers ──

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) + offset * 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

function fmt(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtDate(d: Date) {
  return d.toISOString().split('T')[0];
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const CATEGORY_LABELS: Record<string, string> = {
  dev: '개발',
  video: '영상',
  ops: '운영',
  design: '디자인',
  study: '학습',
  etc: '기타',
};

function CategoryIcon({ category, size = 14, color }: { category?: string; size?: number; color?: string }) {
  const style = { color: color || 'var(--text-tertiary)', flexShrink: 0 } as const;
  switch (category) {
    case 'dev': return <Code2 size={size} style={style} />;
    case 'video': return <Video size={size} style={style} />;
    case 'ops': return <Settings size={size} style={style} />;
    case 'design': return <Palette size={size} style={style} />;
    case 'study': return <BookOpen size={size} style={style} />;
    case 'etc': return <MoreHorizontal size={size} style={style} />;
    default: return <Target size={size} style={style} />;
  }
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
};

// ── Component ──

export default function WeeklyDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<TaskGoal[]>([]);
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [loading, setLoading] = useState(true);

  const week = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const isThisWeek = weekOffset === 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, g, p] = await Promise.all([
        getTasks(),
        getTaskGoals(),
        getTaskProjects(),
      ]);
      setTasks(t);
      setGoals(g);
      setProjects(p);
    } catch (e) {
      console.error('주간 대시보드 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ──

  const weekStart = fmtDate(week.start);
  const weekEnd = fmtDate(week.end);

  const completedThisWeek = useMemo(() =>
    tasks.filter(t =>
      t.status === 'completed' &&
      t.completedAt &&
      t.completedAt.slice(0, 10) >= weekStart &&
      t.completedAt.slice(0, 10) <= weekEnd
    ), [tasks, weekStart, weekEnd]);

  const createdThisWeek = useMemo(() =>
    tasks.filter(t =>
      t.createdAt.slice(0, 10) >= weekStart &&
      t.createdAt.slice(0, 10) <= weekEnd
    ), [tasks, weekStart, weekEnd]);

  const dueThisWeek = useMemo(() =>
    tasks.filter(t =>
      t.dueDate &&
      t.dueDate.slice(0, 10) >= weekStart &&
      t.dueDate.slice(0, 10) <= weekEnd &&
      t.status !== 'completed'
    ), [tasks, weekStart, weekEnd]);

  // Tasks with dueDate in this week range that are NOT completed
  const pendingThisWeek = useMemo(() =>
    tasks.filter(t =>
      t.dueDate &&
      t.dueDate.slice(0, 10) >= weekStart &&
      t.dueDate.slice(0, 10) <= weekEnd &&
      t.status !== 'completed'
    ).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    [tasks, weekStart, weekEnd]);

  // Daily breakdown
  const dailyData = useMemo(() => {
    const days: { date: string; label: string; completed: Task[]; created: Task[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(week.start);
      d.setDate(d.getDate() + i);
      const dateStr = fmtDate(d);
      days.push({
        date: dateStr,
        label: DAY_LABELS[i],
        completed: completedThisWeek.filter(t => t.completedAt?.slice(0, 10) === dateStr),
        created: createdThisWeek.filter(t => t.createdAt.slice(0, 10) === dateStr),
      });
    }
    return days;
  }, [week.start, completedThisWeek, createdThisWeek]);

  const maxCompleted = Math.max(1, ...dailyData.map(d => d.completed.length));

  // Goal progress
  const goalProgress = useMemo(() =>
    goals
      .filter(g => g.status === 'active')
      .map(g => {
        const goalTasks = tasks.filter(t => t.goalId === g.id);
        const total = goalTasks.length;
        const done = goalTasks.filter(t => t.status === 'completed').length;
        const doneThisWeek = goalTasks.filter(t =>
          t.status === 'completed' &&
          t.completedAt &&
          t.completedAt.slice(0, 10) >= weekStart &&
          t.completedAt.slice(0, 10) <= weekEnd
        ).length;
        return { goal: g, total, done, doneThisWeek, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
      })
      .sort((a, b) => b.doneThisWeek - a.doneThisWeek),
    [goals, tasks, weekStart, weekEnd]);

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; color: string; completed: number; created: number }>();
    for (const t of completedThisWeek) {
      const pid = t.projectId || '_inbox';
      if (!map.has(pid)) {
        const p = projects.find(pr => pr.id === pid);
        map.set(pid, { name: p?.name || '미분류', color: p?.color || '#9ca3af', completed: 0, created: 0 });
      }
      map.get(pid)!.completed++;
    }
    for (const t of createdThisWeek) {
      const pid = t.projectId || '_inbox';
      if (!map.has(pid)) {
        const p = projects.find(pr => pr.id === pid);
        map.set(pid, { name: p?.name || '미분류', color: p?.color || '#9ca3af', completed: 0, created: 0 });
      }
      map.get(pid)!.created++;
    }
    return [...map.entries()].sort((a, b) => b[1].completed - a[1].completed);
  }, [completedThisWeek, createdThisWeek, projects]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />)}
          </div>
          <div className="h-64 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>주간 리뷰</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {fmt(week.start)} ~ {fmt(week.end)}
            {isThisWeek && ' (이번 주)'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
          >
            <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          {!isThisWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/5 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              이번 주
            </button>
          )}
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            disabled={isThisWeek}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-30"
          >
            <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<CheckCircle2 size={18} />}
          iconColor="#059669"
          label="완료한 작업"
          value={completedThisWeek.length}
          sub={`${createdThisWeek.length}개 생성`}
        />
        <StatCard
          icon={<Target size={18} />}
          iconColor="#6366f1"
          label="진행 중 목표"
          value={goalProgress.length}
          sub={`${goalProgress.filter(g => g.doneThisWeek > 0).length}개 진전`}
        />
        <StatCard
          icon={<Flame size={18} />}
          iconColor="#ef4444"
          label="마감 임박"
          value={dueThisWeek.length}
          sub="이번 주 마감"
        />
      </div>

      {/* Daily Chart */}
      <Section title="일별 완료" icon={<Calendar size={16} />}>
        <div className="flex items-end gap-3" style={{ height: 140 }}>
          {dailyData.map((day, i) => {
            const isToday = day.date === fmtDate(new Date());
            const barH = maxCompleted > 0 ? (day.completed.length / maxCompleted) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {day.completed.length || ''}
                </span>
                <div className="w-full flex justify-center" style={{ height: 100 }}>
                  <div
                    className="rounded-md transition-all"
                    style={{
                      width: '60%',
                      height: `${Math.max(barH, 4)}%`,
                      background: isToday
                        ? 'linear-gradient(180deg, #6366f1, #818cf8)'
                        : day.completed.length > 0
                          ? 'var(--bg-tertiary)'
                          : 'var(--border-subtle)',
                      alignSelf: 'flex-end',
                      opacity: day.completed.length > 0 ? 1 : 0.4,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-medium"
                  style={{
                    color: isToday ? '#6366f1' : 'var(--text-tertiary)',
                    fontWeight: isToday ? 700 : 500,
                  }}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Goal Progress */}
        <Section title="목표 진행" icon={<Target size={16} />}>
          {goalProgress.length === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--text-tertiary)' }}>활성 목표가 없습니다</p>
          ) : (
            <div className="space-y-4">
              {goalProgress.map(({ goal, total, done, doneThisWeek, pct }) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon category={goal.category} size={14} color={goal.color || '#6366f1'} />
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {goal.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doneThisWeek > 0 && (
                        <span className="text-[11px] font-medium" style={{ color: '#059669' }}>
                          +{doneThisWeek}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {done}/{total}
                      </span>
                    </div>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: goal.color || '#6366f1',
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Project Breakdown */}
        <Section title="프로젝트별" icon={<TrendingUp size={16} />}>
          {projectBreakdown.length === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--text-tertiary)' }}>이번 주 활동 없음</p>
          ) : (
            <div className="space-y-3">
              {projectBreakdown.map(([id, info]) => (
                <div key={id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded flex-shrink-0"
                      style={{ background: info.color }}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {info.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {info.completed > 0 && (
                      <span style={{ color: '#059669' }}>{info.completed} 완료</span>
                    )}
                    {info.created > 0 && (
                      <span>{info.created} 생성</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Pending Tasks This Week */}
      {isThisWeek && pendingThisWeek.length > 0 && (
        <div className="mt-6">
          <Section title={`이번 주 미완료 작업 (${pendingThisWeek.length})`} icon={<Circle size={16} />}>
            <div className="space-y-1">
              {pendingThisWeek.map(task => {
                const goal = goals.find(g => g.id === task.goalId);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/[0.02] transition-colors"
                  >
                    <button
                      onClick={async () => {
                        await updateTask(task.id, { status: 'completed', completedAt: new Date().toISOString() });
                        load();
                      }}
                      className="flex-shrink-0 transition-opacity hover:opacity-70"
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                      title="완료 처리"
                    >
                      <Circle size={14} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY_COLORS[task.priority] || '#6b7280' }}
                    />
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {task.title}
                    </span>
                    {goal && (
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: (goal.color || '#6366f1') + '15',
                          color: goal.color || '#6366f1',
                        }}
                      >
                        {goal.title}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {fmt(new Date(task.dueDate))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {/* Completed Tasks List */}
      <div className="mt-6">
        <Section title={`완료한 작업 (${completedThisWeek.length})`} icon={<CheckCircle2 size={16} />}>
          {completedThisWeek.length === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--text-tertiary)' }}>
              {isThisWeek ? '아직 완료한 작업이 없습니다' : '완료한 작업이 없습니다'}
            </p>
          ) : (
            <div className="space-y-1">
              {completedThisWeek
                .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
                .map(task => {
                  const goal = goals.find(g => g.id === task.goalId);
                  const completedDate = task.completedAt ? new Date(task.completedAt) : null;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/[0.02] transition-colors"
                    >
                      <button
                        onClick={async () => {
                          await updateTask(task.id, { status: 'pending', completedAt: null });
                          load();
                        }}
                        className="flex-shrink-0 transition-opacity hover:opacity-50"
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                        title="완료 취소"
                      >
                        <CheckCircle2 size={14} style={{ color: '#059669' }} />
                      </button>
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: PRIORITY_COLORS[task.priority] || '#6b7280' }}
                      />
                      <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                        {task.title}
                      </span>
                      {goal && (
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            background: (goal.color || '#6366f1') + '15',
                            color: goal.color || '#6366f1',
                          }}
                        >
                          {goal.title}
                        </span>
                      )}
                      {completedDate && (
                        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                          {fmt(completedDate)}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ── Sub-components ──

function StatCard({ icon, iconColor, label, value, sub }: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-elevated)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: iconColor + '12', color: iconColor }}
      >
        {icon}
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>{sub}</p>
    </div>
  );
}

function Section({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--bg-elevated)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
