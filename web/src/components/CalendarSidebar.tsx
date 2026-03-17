'use client';

import { useState, useMemo } from 'react';
import { type PomoTask, type PomoGoal } from '@/lib/api';

interface Props {
  tasks: PomoTask[];
  goals: PomoGoal[];
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

export default function CalendarSidebar({ tasks, goals }: Props) {
  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const { tasksByDate, goalsByDate } = useMemo(() => {
    const tbd: Record<string, PomoTask[]> = {};
    const gbd: Record<string, PomoGoal[]> = {};
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

  const selectedDateLabel = useMemo(() => {
    const d = parseLocalDate(selectedDate);
    const isToday = selectedDate === todayStr;
    const label = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    const dow = DOW_LABELS[d.getDay()];
    return isToday ? `오늘 · ${label} ${dow}요일` : `${label} ${dow}요일`;
  }, [selectedDate, todayStr]);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <div className="flex flex-col h-full" style={{ padding: '20px 16px' }}>
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
              style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}
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
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((dow, i) => (
          <div
            key={dow}
            className="text-center text-[11px] font-medium py-1"
            style={{
              color: i === 0 ? 'var(--red)' : i === 6 ? 'var(--blue)' : 'var(--text-tertiary)',
            }}
          >
            {dow}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-0.5 mb-4">
        {calendarDays.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} className="h-9" />;

          const { dateStr, day } = cell;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate && !isToday;
          const hasTasks = !!tasksByDate[dateStr]?.length;
          const hasGoals = !!goalsByDate[dateStr]?.length;
          const goalColor = hasGoals ? (goalsByDate[dateStr][0].color || 'var(--accent)') : null;
          const isSunday = idx % 7 === 0;
          const isSaturday = idx % 7 === 6;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className="h-9 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all relative"
              style={{
                background: isToday
                  ? 'var(--accent)'
                  : isSelected
                  ? 'var(--accent-soft)'
                  : 'transparent',
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
                className="text-xs leading-none"
                style={{
                  fontWeight: isToday ? 700 : 400,
                  color: isToday
                    ? '#fff'
                    : isSelected
                    ? 'var(--accent)'
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
                <div className="flex gap-px items-center" style={{ height: '3px' }}>
                  {hasTasks && (
                    <span className="block rounded-full" style={{ width: '3px', height: '3px', background: isToday ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }} />
                  )}
                  {hasGoals && goalColor && (
                    <span className="block rounded-full" style={{ width: '3px', height: '3px', background: isToday ? 'rgba(255,255,255,0.9)' : goalColor }} />
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
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: goal.color || 'var(--accent)' }} />
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
    </div>
  );
}
