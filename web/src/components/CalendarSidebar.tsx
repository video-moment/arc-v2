'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { type Task, type TaskGoal, type TaskProject } from '@/lib/api';

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];

interface Props {
  tasks: Task[];
  goals: TaskGoal[];
  projects?: TaskProject[];
  selectedProjectId?: string | null;
  onSelectProject?: (id: string | null) => void;
  onCreateProject?: (name: string, color: string) => void;
  onDeleteProject?: (id: string) => void;
  onUpdateProject?: (id: string, updates: Partial<{ name: string; color: string }>) => void;
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarSidebar({ tasks, goals, projects = [], selectedProjectId, onSelectProject, onCreateProject, onDeleteProject, onUpdateProject }: Props) {
  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const { tasksByDate, goalsByDate } = useMemo(() => {
    const tbd: Record<string, Task[]> = {};
    const gbd: Record<string, TaskGoal[]> = {};
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = task.dueDate.slice(0, 10);
      if (!tbd[key]) tbd[key] = [];
      tbd[key].push(task);
    }
    for (const goal of goals) {
      if (!goal.targetDate) continue;
      const key = goal.targetDate.slice(0, 10);
      if (!gbd[key]) gbd[key] = [];
      gbd[key].push(goal);
    }
    return { tasksByDate: tbd, goalsByDate: gbd };
  }, [tasks, goals]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDow = firstDay.getDay();
    const days: Array<{ dateStr: string; day: number } | null> = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, day: d });
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  const selectedTasks = tasksByDate[selectedDate] ?? [];
  const selectedGoalsForMonth = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return goals.filter(g => g.targetDate && g.targetDate.slice(0, 7) === prefix);
  }, [goals, viewYear, viewMonth]);

  const undatedTasks = useMemo(() =>
    tasks.filter(t => !t.dueDate && t.status !== 'completed'),
    [tasks]);

  const selectedDateLabel = useMemo(() => {
    const d = parseLocalDate(selectedDate);
    const isToday = selectedDate === todayStr;
    const label = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    const dow = DOW_LABELS[d.getDay()];
    return isToday ? `오늘 · ${label} ${dow}요일` : `${label} ${dow}요일`;
  }, [selectedDate, todayStr]);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Project section state
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const [undatedExpanded, setUndatedExpanded] = useState(false);

  useEffect(() => {
    if (showProjectForm) setTimeout(() => newInputRef.current?.focus(), 30);
  }, [showProjectForm]);

  useEffect(() => {
    if (editingProjectId) setTimeout(() => editInputRef.current?.select(), 30);
  }, [editingProjectId]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !onCreateProject) return;
    onCreateProject(newProjectName.trim(), newProjectColor);
    setNewProjectName('');
    setNewProjectColor(PROJECT_COLORS[0]);
    setShowProjectForm(false);
  };

  const handleEditCommit = (id: string) => {
    const trimmed = editName.trim();
    if (trimmed && onUpdateProject) {
      onUpdateProject(id, { name: trimmed });
    }
    setEditingProjectId(null);
  };

  const getProjectTaskCount = (projectId: string) =>
    tasks.filter(t => t.status !== 'completed' && t.projectId === projectId).length;

  const getProjectGoalCount = (projectId: string) =>
    goals.filter(g => g.projectId === projectId).length;

  return (
    <div className="flex flex-col h-full" style={{ padding: '20px 16px' }}>
      {/* Project section */}
      {projects.length > 0 || onCreateProject ? (
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
              프로젝트
            </span>
            {onCreateProject && (
              <button
                onClick={() => setShowProjectForm(v => !v)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}
              >
                {showProjectForm ? '×' : '+'}
              </button>
            )}
          </div>

          {/* Project list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* "전체" button */}
            <button
              onClick={() => onSelectProject?.(null)}
              className="w-full flex items-center gap-2 rounded-lg transition-all"
              style={{
                padding: '7px 10px',
                background: !selectedProjectId ? 'var(--accent-soft)' : 'transparent',
                color: !selectedProjectId ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: !selectedProjectId ? 600 : 400,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-tertiary)', flexShrink: 0 }} />
              전체
              <span className="ml-auto text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {tasks.filter(t => t.status !== 'completed').length}
              </span>
            </button>

            {projects.map(p => {
              const isSelected = selectedProjectId === p.id;
              const isEditing = editingProjectId === p.id;
              const taskCount = getProjectTaskCount(p.id);
              const goalCount = getProjectGoalCount(p.id);

              return (
                <div key={p.id} className="group flex items-center">
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => handleEditCommit(p.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditCommit(p.id);
                        if (e.key === 'Escape') setEditingProjectId(null);
                      }}
                      className="flex-1 rounded-lg"
                      style={{
                        padding: '7px 10px',
                        fontSize: '13px',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--color-accent)',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => onSelectProject?.(isSelected ? null : p.id)}
                      onDoubleClick={() => { setEditingProjectId(p.id); setEditName(p.name); }}
                      className="flex-1 flex items-center gap-2 rounded-lg transition-all"
                      style={{
                        padding: '7px 10px',
                        background: isSelected ? 'var(--accent-soft)' : 'transparent',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {goalCount > 0 ? goalCount + '목표' : ''}{goalCount > 0 && taskCount > 0 ? ' · ' : ''}{taskCount > 0 ? taskCount : ''}
                      </span>
                    </button>
                  )}
                  {!isEditing && onDeleteProject && (
                    <button
                      onClick={() => onDeleteProject(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* New project form */}
          {showProjectForm && (
            <form onSubmit={handleCreateProject} style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                ref={newInputRef}
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="프로젝트 이름"
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {PROJECT_COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewProjectColor(c)}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: c,
                      border: newProjectColor === c ? '2.5px solid var(--text-primary)' : '2.5px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none',
                      transition: 'transform 0.1s',
                      transform: newProjectColor === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    background: newProjectName.trim() ? 'var(--btn-primary)' : 'var(--bg-tertiary)',
                    color: newProjectName.trim() ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
                    cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => { setShowProjectForm(false); setNewProjectName(''); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                    background: 'var(--btn-secondary)',
                    color: 'var(--btn-secondary-text)',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={goToPrevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-all"
          style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {viewYear}년 {viewMonth + 1}월
          </span>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="text-[10px] px-1.5 py-0.5 rounded-md transition-all"
              style={{ color: 'var(--color-accent)', background: 'var(--accent-soft)' }}
            >
              오늘
            </button>
          )}
        </div>
        <button
          onClick={goToNextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-all"
          style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Day of week header */}
      <div className="grid grid-cols-7 mb-1" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        {DOW_LABELS.map((dow, i) => (
          <div
            key={dow}
            className="text-center text-[13px] font-semibold"
            style={{
              color: i === 0 ? 'var(--red)' : i === 6 ? 'var(--blue)' : 'var(--text-secondary)',
            }}
          >
            {dow}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 mb-4" style={{ paddingTop: '4px' }}>
        {calendarDays.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} style={{ height: '38px' }} />;

          const { dateStr, day } = cell;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate && !isToday;
          const hasTasks = !!tasksByDate[dateStr]?.length;
          const hasGoals = !!goalsByDate[dateStr]?.length;
          const goalColor = hasGoals ? (goalsByDate[dateStr][0].color || 'var(--color-accent)') : null;
          const isSunday = idx % 7 === 0;
          const isSaturday = idx % 7 === 6;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className="flex flex-col items-center justify-center gap-0.5 transition-all relative"
              style={{
                height: '38px',
                borderRadius: '8px',
                background: isToday
                  ? '#10b981'
                  : isSelected
                  ? 'var(--accent-soft)'
                  : 'transparent',
                boxShadow: isToday ? '0 2px 8px rgba(16,185,129,0.35)' : 'none',
                cursor: 'pointer',
                border: 'none',
              }}
              onMouseEnter={e => {
                if (!isToday && !isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={e => {
                if (!isToday && !isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  lineHeight: 1,
                  fontWeight: isToday ? 700 : isSelected ? 600 : 500,
                  color: isToday
                    ? '#fff'
                    : isSelected
                    ? 'var(--color-accent)'
                    : isSunday
                    ? 'var(--red)'
                    : isSaturday
                    ? 'var(--blue)'
                    : 'var(--text-primary)',
                }}
              >
                {day}
              </span>
              {/* Indicator dots */}
              {(hasTasks || hasGoals) && (
                <div className="flex gap-0.5 items-center" style={{ height: '4px' }}>
                  {hasTasks && (
                    <span className="block rounded-full" style={{ width: '4px', height: '4px', background: isToday ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)' }} />
                  )}
                  {hasGoals && goalColor && (
                    <span className="block rounded-full" style={{ width: '4px', height: '4px', background: isToday ? 'rgba(255,255,255,0.9)' : goalColor }} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px mb-4" style={{ background: 'var(--border-subtle)' }} />

      {/* Selected date info */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {selectedDateLabel}
        </p>

        {selectedTasks.length === 0 && selectedGoalsForMonth.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>일정 없음</p>
        ) : (
          <div className="space-y-3">
            {/* Tasks */}
            {selectedTasks.length > 0 && (
              <div className="space-y-1">
                {selectedTasks.map(task => {
                  const done = task.status === 'completed';
                  const pColor = task.priority === 'high' ? 'var(--red)' : task.priority === 'medium' ? 'var(--yellow)' : 'var(--text-tertiary)';
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-md transition-all"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pColor }} />
                      <span
                        className="text-xs flex-1 truncate"
                        style={{
                          color: done ? 'var(--text-tertiary)' : 'var(--text-primary)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </span>
                      {done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Goals for this month */}
            {selectedGoalsForMonth.length > 0 && (
              <div>
                <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  이번 달 목표
                </p>
                <div className="space-y-1">
                  {selectedGoalsForMonth.map(goal => {
                    const dateLabel = goal.targetDate
                      ? `${parseLocalDate(goal.targetDate).getMonth() + 1}/${parseLocalDate(goal.targetDate).getDate()}`
                      : '';
                    return (
                      <div
                        key={goal.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-md transition-all"
                        style={{ background: 'transparent' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: goal.color || 'var(--color-accent)' }} />
                        <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                          {goal.title}
                        </span>
                        {dateLabel && (
                          <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                            {dateLabel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Undated tasks section */}
      {undatedTasks.length > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setUndatedExpanded(v => !v)}
            className="w-full flex items-center justify-between"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
              마감일 미설정
            </span>
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {undatedTasks.length}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: 'var(--text-tertiary)',
                  transform: undatedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {undatedExpanded && (
            <div className="space-y-1 mt-2">
              {undatedTasks.slice(0, 10).map(task => {
                const goal = goals.find(g => g.id === task.goalId);
                const pColor = task.priority === 'high' ? 'var(--red)' : task.priority === 'medium' ? 'var(--yellow)' : 'var(--text-tertiary)';
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md transition-all"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pColor }} />
                    <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {task.title}
                    </span>
                    {goal && (
                      <span
                        className="text-[10px] flex-shrink-0"
                        style={{ color: goal.color || 'var(--color-accent)' }}
                      >
                        {goal.title}
                      </span>
                    )}
                  </div>
                );
              })}
              {undatedTasks.length > 10 && (
                <p className="text-[11px] px-2 pt-1" style={{ color: 'var(--text-tertiary)' }}>
                  +{undatedTasks.length - 10}개 더
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
