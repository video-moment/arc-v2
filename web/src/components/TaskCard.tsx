import StatusBadge from './StatusBadge';
import type { Task } from '@/lib/api';

interface Props {
  task: Task;
  onStatusChange?: (id: string, status: Task['status']) => void;
  onDelete?: (id: string) => void;
}

const NEXT_STATUS: Record<string, { status: Task['status']; label: string }> = {
  pending:     { status: 'in_progress', label: '진행 시작' },
  in_progress: { status: 'completed',  label: '완료 처리' },
  completed:   { status: 'pending',    label: '다시 열기' },
  failed:      { status: 'pending',    label: '재시도' },
};

export default function TaskCard({ task, onStatusChange, onDelete }: Props) {
  const next = NEXT_STATUS[task.status];

  return (
    <div
      className="rounded-2xl p-5 animate-fade-in transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-sm leading-snug flex-1 mr-3">{task.title}</h4>
        <StatusBadge status={task.status} />
      </div>
      {task.description && (
        <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {onStatusChange && next && (
          <button
            onClick={() => onStatusChange(task.id, next.status)}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer hover:brightness-110"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}
          >
            {next.label}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer hover:brightness-110 ml-auto"
            style={{ background: 'var(--red-soft)', color: 'var(--red)' }}
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
