'use client';

import { useState } from 'react';
import type { PomoTask } from '@/lib/api';
import { TomatoIcon, CheckIcon, XIcon, EditIcon, CalendarIcon } from './Icons';

interface Props {
  task: PomoTask;
  isActive: boolean;
  onSelect: (task: PomoTask) => void;
  onToggleComplete: (task: PomoTask) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Record<string, any>) => void;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'var(--red-soft)', text: 'var(--red)', label: '높음' },
  medium: { bg: 'var(--yellow-soft)', text: 'var(--yellow)', label: '보통' },
  low: { bg: 'var(--green-soft)', text: 'var(--green)', label: '낮음' },
};

function formatDueDate(dueDate: string): { text: string; urgent: boolean } {
  const now = new Date();
  const due = new Date(dueDate);
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const dueStr = due.toISOString().split('T')[0];

  const daysLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (dueStr < todayStr) return { text: '기한 초과', urgent: true };
  if (dueStr === todayStr) return { text: '오늘', urgent: true };
  if (dueStr === tomorrowStr) return { text: '내일', urgent: daysLeft <= 1 };
  return {
    text: (due.getMonth() + 1) + '/' + due.getDate(),
    urgent: daysLeft <= 3,
  };
}

export default function TaskItem({ task, isActive, onSelect, onToggleComplete, onDelete, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<string>(task.priority);
  const [editPomos, setEditPomos] = useState(task.estimatedPomodoros);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [editCategory, setEditCategory] = useState(task.category || '');

  const priority = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const isCompleted = task.status === 'completed';
  const pomoProgress = task.estimatedPomodoros > 0
    ? Math.min(task.completedPomodoros / task.estimatedPomodoros, 1)
    : 0;

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditPomos(task.estimatedPomodoros);
    setEditDueDate(task.dueDate || '');
    setEditCategory(task.category || '');
    setIsEditing(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate || !editTitle.trim()) return;
    onUpdate(task.id, {
      title: editTitle.trim(),
      priority: editPriority,
      estimatedPomodoros: editPomos,
      dueDate: editDueDate || null,
      category: editCategory.trim() || null,
    });
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <div
      className="group rounded-lg transition-all duration-150"
      style={{
        background: isActive ? 'var(--accent-soft)' : 'transparent',
        borderLeft: isActive
          ? '3px solid var(--accent)'
          : '3px solid transparent',
        boxShadow: isActive ? '0 0 12px rgba(139, 92, 246, 0.08)' : 'none',
      }}
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={() => !isCompleted && !isEditing && onSelect(task)}
        onMouseEnter={e => {
          if (!isActive && !isEditing) {
            e.currentTarget.parentElement!.style.background = 'var(--bg-hover, var(--bg-elevated))';
            e.currentTarget.parentElement!.style.borderLeftColor = 'var(--accent)';
          }
        }}
        onMouseLeave={e => {
          if (!isActive && !isEditing) {
            e.currentTarget.parentElement!.style.background = 'transparent';
            e.currentTarget.parentElement!.style.borderLeftColor = 'transparent';
          }
        }}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
          className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            borderColor: isCompleted ? 'var(--green)' : 'var(--border)',
            background: isCompleted ? 'var(--green)' : 'transparent',
          }}
        >
          {isCompleted && <CheckIcon />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-medium truncate"
              style={{
                color: isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
              style={{ background: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
            {dueDateInfo && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 flex items-center gap-0.5"
                style={{
                  background: dueDateInfo.urgent ? 'var(--red-soft)' : 'rgba(59, 130, 246, 0.1)',
                  color: dueDateInfo.urgent ? 'var(--red)' : 'var(--blue)',
                }}
              >
                <CalendarIcon size={9} />
                {dueDateInfo.text}
              </span>
            )}
            {task.category && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
              >
                {task.category}
              </span>
            )}
          </div>
        </div>

        {/* Pomodoro count + mini progress */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <TomatoIcon size={12} /> {task.completedPomodoros}/{task.estimatedPomodoros}
          </span>
          {task.estimatedPomodoros > 0 && (
            <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: (pomoProgress * 100) + '%',
                  background: pomoProgress >= 1 ? 'var(--green)' : 'var(--accent)',
                }}
              />
            </div>
          )}
        </div>

        {/* Edit button */}
        {onUpdate && !isCompleted && (
          <button
            onClick={handleStartEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <EditIcon size={13} />
          </button>
        )}

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* Inline edit panel */}
      {isEditing && (
        <div
          className="px-4 py-3 space-y-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
          onClick={e => e.stopPropagation()}
        >
          <input
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={editPriority}
              onChange={e => setEditPriority(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
            <div className="flex items-center gap-1">
              <TomatoIcon size={13} />
              <input
                type="number"
                min={1}
                max={10}
                value={editPomos}
                onChange={e => setEditPomos(Number(e.target.value))}
                className="w-12 px-2 py-1.5 rounded-lg text-xs outline-none text-center"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
            <div className="flex items-center gap-1">
              <CalendarIcon size={13} />
              <input
                type="date"
                value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
            <input
              value={editCategory}
              onChange={e => setEditCategory(e.target.value)}
              placeholder="카테고리"
              className="px-2 py-1.5 rounded-lg text-xs outline-none w-24"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                저장
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
