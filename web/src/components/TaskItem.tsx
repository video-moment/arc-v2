'use client';

import { useState, useRef, useEffect } from 'react';
import type { Task, TaskGoal } from '@/lib/api';
import { CheckIcon, XIcon, CalendarIcon, BotIcon } from './Icons';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';

interface Props {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Record<string, any>) => void;
  goals?: TaskGoal[];
  agents?: { id: string; name: string }[];
}

const AGENT_STATUS_CYCLE: Array<Task['status']> = ['pending', 'in_progress', 'completed'];

function formatDueDate(dueDate: string): { text: string; urgent: boolean; overdue: boolean } {
  const now = new Date();
  const due = new Date(dueDate);
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const dueStr = due.toISOString().split('T')[0];

  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (dueStr < todayStr) return { text: (due.getMonth() + 1) + '/' + due.getDate() + ' 초과', urgent: true, overdue: true };
  if (dueStr === todayStr) return { text: 'D-Day', urgent: true, overdue: false };
  if (dueStr === tomorrowStr) return { text: 'D-1', urgent: true, overdue: false };
  if (daysLeft <= 7) return { text: 'D-' + daysLeft, urgent: true, overdue: false };
  return {
    text: (due.getMonth() + 1) + '/' + due.getDate(),
    urgent: false,
    overdue: false,
  };
}

const PRIORITY_DOT: Record<string, string | null> = {
  high: 'var(--red)',
  medium: 'var(--yellow)',
  low: null,
};

// ── Edit Modal ──
function TaskEditModal({
  task,
  goals,
  agents,
  onSave,
  onClose,
}: {
  task: Task;
  goals?: TaskGoal[];
  agents?: { id: string; name: string }[];
  onSave: (id: string, updates: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<string>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [category, setCategory] = useState(task.category || '');
  const [goalId, setGoalId] = useState(task.goalId || '');
  const [assignee, setAssignee] = useState<'me' | 'agent'>(task.assigneeType || 'me');
  const [agentId, setAgentId] = useState(task.assigneeAgentId || '');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(task.id, {
      title: title.trim(),
      priority,
      dueDate: dueDate || null,
      category: category.trim() || null,
      goalId: goalId || null,
      assigneeType: assignee,
      assigneeAgentId: assignee === 'agent' && agentId ? agentId : null,
    });
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, backdropFilter: 'blur(2px)' }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '460px',
          maxWidth: '92vw',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          zIndex: 1000,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>할 일 수정</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>제목</label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSave(); }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none' }}
            />
          </div>

          {/* Priority + Due date + Category */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>우선순위</label>
              <CustomSelect
                size="md"
                value={priority}
                options={[
                  { value: 'high', label: '높음', color: 'var(--red)' },
                  { value: 'medium', label: '보통', color: 'var(--yellow)' },
                  { value: 'low', label: '낮음' },
                ]}
                onChange={setPriority}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>마감일</label>
              <CustomDatePicker
                size="md"
                value={dueDate}
                onChange={setDueDate}
                placeholder="날짜 선택"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>카테고리</label>
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="선택"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Goal + Assignee */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {goals && goals.length > 0 && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>목표</label>
                <CustomSelect
                  size="md"
                  value={goalId}
                  options={[
                    { value: '', label: '없음' },
                    ...goals.map(g => ({ value: g.id, label: g.title, color: g.color })),
                  ]}
                  onChange={setGoalId}
                />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>담당</label>
              <CustomSelect
                size="md"
                value={assignee === 'agent' ? agentId : 'me'}
                options={[
                  { value: 'me', label: '나' },
                  ...(agents ?? []).map(a => ({ value: a.id, label: a.name })),
                ]}
                onChange={val => {
                  if (val === 'me') { setAssignee('me'); setAgentId(''); }
                  else { setAssignee('agent'); setAgentId(val); }
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, border: 'none', background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={{ padding: '9px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', background: title.trim() ? 'var(--btn-primary)' : 'var(--bg-tertiary)', color: title.trim() ? 'var(--btn-primary-text)' : 'var(--text-tertiary)', cursor: title.trim() ? 'pointer' : 'not-allowed' }}
          >
            저장
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main TaskItem ──
export default function TaskItem({ task, onToggleComplete, onDelete, onUpdate, goals, agents }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);

  const isCompleted = task.status === 'completed';
  const priorityDot = PRIORITY_DOT[task.priority] ?? null;
  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  const handleAgentStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;
    const currentIdx = AGENT_STATUS_CYCLE.indexOf(task.status);
    const nextStatus = AGENT_STATUS_CYCLE[(currentIdx + 1) % AGENT_STATUS_CYCLE.length];
    onUpdate(task.id, { status: nextStatus });
  };

  const goalInfo = task.goalId && goals ? goals.find(g => g.id === task.goalId) : null;

  return (
    <>
      <div
        className="group transition-all duration-150"
        onDoubleClick={() => onUpdate && !isCompleted && setShowEditModal(true)}
        style={{
          borderRadius: '8px',
          background: isCompleted ? 'var(--bg-secondary)' : 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          cursor: 'default',
          opacity: isCompleted ? 0.5 : 1,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!isCompleted) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { if (!isCompleted) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
      >
          {/* Row 1: Checkbox + Title + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: isCompleted ? 'none' : '1.5px solid #d1d5db',
                background: isCompleted ? 'var(--green)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isCompleted) (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)'; }}
              onMouseLeave={e => { if (!isCompleted) (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db'; }}
            >
              {isCompleted && <CheckIcon />}
            </button>

            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </span>

            {task.assigneeType === 'agent' && (
              <button
                onClick={handleAgentStatusCycle}
                className="text-[11px] px-2 py-0.5 rounded-md font-medium transition-all flex-shrink-0"
                style={
                  task.status === 'completed'
                    ? { background: 'var(--green-soft)', color: 'var(--green)', border: 'none' }
                    : task.status === 'in_progress'
                    ? { background: 'var(--yellow-soft)', color: 'var(--yellow)', border: 'none' }
                    : { background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: 'none' }
                }
              >
                {task.status === 'completed' ? '완료' : task.status === 'in_progress' ? '진행중' : '대기'}
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0"
              style={{ color: 'var(--text-tertiary)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px' }}
            >
              <XIcon size={12} />
            </button>
          </div>

          {/* Row 2: Meta — only show if there's something to display */}
          {!isCompleted && (dueDateInfo || goalInfo || task.category) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '28px' }}>
              {/* Due date */}
              {dueDateInfo && (
                <span
                  style={{
                    fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px',
                    padding: '1px 7px', borderRadius: '4px',
                    background: dueDateInfo.overdue ? '#fecaca' : dueDateInfo.urgent ? 'rgba(239,68,68,0.08)' : 'var(--bg-tertiary)',
                    color: dueDateInfo.overdue ? '#991b1b' : dueDateInfo.urgent ? '#dc2626' : 'var(--text-secondary)',
                  }}
                >
                  <CalendarIcon size={9} />
                  {dueDateInfo.text}
                </span>
              )}

              {/* Goal */}
              {goalInfo && (
                <span style={{ fontSize: '11px', fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: goalInfo.color || '#6366f1', flexShrink: 0 }} />
                  {goalInfo.title}
                </span>
              )}

              {/* Category */}
              {task.category && (
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-tertiary)' }}>
                  {task.category}
                </span>
              )}

              {/* Agent */}
              {task.assigneeType === 'agent' && task.assigneeAgentId && (
                <span style={{ fontSize: '11px', fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                  <BotIcon size={9} />
                  {(() => { const a = agents?.find(x => x.id === task.assigneeAgentId); return a ? a.name : task.assigneeAgentId; })()}
                </span>
              )}
            </div>
          )}
      </div>

      {/* Edit modal */}
      {showEditModal && onUpdate && (
        <TaskEditModal
          task={task}
          goals={goals}
          agents={agents}
          onSave={(id, updates) => { onUpdate(id, updates); }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
