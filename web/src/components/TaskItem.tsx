'use client';

import { useState } from 'react';
import type { PomoTask, PomoGoal } from '@/lib/api';
import { CheckIcon, XIcon, EditIcon, CalendarIcon, BotIcon } from './Icons';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';

interface Props {
  task: PomoTask;
  onToggleComplete: (task: PomoTask) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Record<string, any>) => void;
  goals?: PomoGoal[];
  agents?: { id: string; name: string }[];
}

const AGENT_STATUS_CYCLE: Array<PomoTask['status']> = ['pending', 'in_progress', 'completed'];

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

// Priority dot colors — high=red, medium=yellow, low=hidden
const PRIORITY_DOT: Record<string, string | null> = {
  high: 'var(--red)',
  medium: 'var(--yellow)',
  low: null,
};

export default function TaskItem({ task, onToggleComplete, onDelete, onUpdate, goals, agents }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<string>(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [editCategory, setEditCategory] = useState(task.category || '');
  const [editGoalId, setEditGoalId] = useState(task.goalId || '');
  const [editAssignee, setEditAssignee] = useState<'me' | 'agent'>(task.assigneeType || 'me');
  const [editAgentId, setEditAgentId] = useState(task.assigneeAgentId || '');

  const isCompleted = task.status === 'completed';
  const priorityDot = PRIORITY_DOT[task.priority] ?? null;
  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate || '');
    setEditCategory(task.category || '');
    setEditGoalId(task.goalId || '');
    setEditAssignee(task.assigneeType || 'me');
    setEditAgentId(task.assigneeAgentId || '');
    setIsEditing(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate || !editTitle.trim()) return;
    onUpdate(task.id, {
      title: editTitle.trim(),
      priority: editPriority,
      dueDate: editDueDate || null,
      category: editCategory.trim() || null,
      goalId: editGoalId || null,
      assigneeType: editAssignee,
      assigneeAgentId: editAssignee === 'agent' && editAgentId ? editAgentId : null,
    });
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleAgentStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;
    const currentIdx = AGENT_STATUS_CYCLE.indexOf(task.status);
    const nextStatus = AGENT_STATUS_CYCLE[(currentIdx + 1) % AGENT_STATUS_CYCLE.length];
    onUpdate(task.id, { status: nextStatus });
  };

  return (
    <div
      className="group rounded-md transition-all duration-150"
      style={{
        borderLeft: '2px solid transparent',
      }}
    >
      <div
        className="flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150"
        style={{ background: 'transparent', cursor: 'default' }}
        onMouseEnter={e => {
          if (!isEditing) {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
          }
        }}
        onMouseLeave={e => {
          if (!isEditing) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }
        }}
      >
        {/* Circular checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            border: isCompleted ? 'none' : '1.5px solid var(--border)',
            background: isCompleted ? 'var(--green)' : 'transparent',
          }}
          onMouseEnter={e => {
            if (!isCompleted) (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)';
          }}
          onMouseLeave={e => {
            if (!isCompleted) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
        >
          {isCompleted && <CheckIcon />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {/* Priority dot */}
          {priorityDot && !isCompleted && (
            <div
              className="flex-shrink-0 w-2 h-2 rounded-full"
              style={{ background: priorityDot }}
            />
          )}

          {/* Title */}
          <span
            className="text-sm font-medium truncate"
            style={{
              color: isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)',
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </span>

          {/* Goal tag */}
          {task.goalId && goals && (() => {
            const goal = goals.find(g => g.id === task.goalId);
            if (!goal) return null;
            return (
              <span
                className="flex-shrink-0 flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-tertiary)',
                  maxWidth: '90px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: goal.color || 'var(--accent)', display: 'inline-block' }}
                />
                <span className="truncate">{goal.title}</span>
              </span>
            );
          })()}

          {/* Due date */}
          {dueDateInfo && (
            <span
              className="text-[11px] flex items-center gap-0.5 flex-shrink-0"
              style={{
                color: dueDateInfo.urgent ? 'var(--red)' : 'var(--text-tertiary)',
              }}
            >
              <CalendarIcon size={9} />
              {dueDateInfo.text}
            </span>
          )}

          {/* Category */}
          {task.category && (
            <span
              className="text-[11px] flex-shrink-0"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {task.category}
            </span>
          )}

          {/* Agent badge */}
          {task.assigneeType === 'agent' && task.assigneeAgentId && (
            <span
              className="text-[11px] flex items-center gap-0.5 flex-shrink-0"
              style={{ color: 'var(--blue)' }}
            >
              <BotIcon size={9} />{task.assigneeAgentId}
            </span>
          )}
        </div>

        {/* Right side: agent status chip only */}
        {task.assigneeType === 'agent' && (
          <div className="flex-shrink-0">
            <button
              onClick={handleAgentStatusCycle}
              className="text-[11px] px-2 py-0.5 rounded-full font-medium transition-all"
              style={
                task.status === 'completed'
                  ? { background: 'var(--green-soft)', color: 'var(--green)' }
                  : task.status === 'in_progress'
                  ? { background: 'var(--yellow-soft)', color: 'var(--yellow)' }
                  : { background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }
              }
            >
              {task.status === 'completed' ? '완료' : task.status === 'in_progress' ? '진행중' : '대기'}
            </button>
          </div>
        )}

        {/* Edit button — hover only */}
        {onUpdate && !isCompleted && (
          <button
            onClick={handleStartEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <EditIcon size={13} />
          </button>
        )}

        {/* Delete — hover only */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <XIcon size={13} />
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
            <CustomSelect
              size="sm"
              value={editPriority}
              options={[
                { value: 'high', label: '높음', color: 'var(--red)' },
                { value: 'medium', label: '보통', color: 'var(--yellow)' },
                { value: 'low', label: '낮음' },
              ]}
              onChange={setEditPriority}
            />
            <CustomDatePicker
              size="sm"
              value={editDueDate}
              onChange={setEditDueDate}
              placeholder="날짜"
            />
            <input
              value={editCategory}
              onChange={e => setEditCategory(e.target.value)}
              placeholder="카테고리"
              className="px-2 py-1.5 rounded-lg text-xs outline-none w-24"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            {goals && goals.length > 0 && (
              <CustomSelect
                size="sm"
                value={editGoalId}
                options={[
                  { value: '', label: '목표 없음' },
                  ...goals.map(g => ({ value: g.id, label: g.title, color: g.color })),
                ]}
                onChange={setEditGoalId}
                placeholder="목표"
              />
            )}
            <CustomSelect
              size="sm"
              value={editAssignee === 'agent' ? editAgentId : 'me'}
              options={[
                { value: 'me', label: '나' },
                ...(agents ?? []).map(a => ({ value: a.id, label: a.name })),
              ]}
              onChange={val => {
                if (val === 'me') {
                  setEditAssignee('me');
                  setEditAgentId('');
                } else {
                  setEditAssignee('agent');
                  setEditAgentId(val);
                }
              }}
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
