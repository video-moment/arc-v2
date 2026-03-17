import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

const CONFIG: Record<string, { dotClass: string; textClass: string; bgClass: string; label: string }> = {
  online:      { dotClass: 'bg-emerald-500 animate-pulse-dot', textClass: 'text-emerald-600',          bgClass: 'bg-emerald-500/10 border-emerald-500/20', label: '온라인' },
  offline:     { dotClass: 'bg-muted-foreground/50',           textClass: 'text-muted-foreground',      bgClass: 'bg-muted border-border',                 label: '오프라인' },
  error:       { dotClass: 'bg-destructive',                   textClass: 'text-destructive',           bgClass: 'bg-destructive/10 border-destructive/20', label: '오류' },
  active:      { dotClass: 'bg-emerald-500 animate-pulse-dot', textClass: 'text-emerald-600',           bgClass: 'bg-emerald-500/10 border-emerald-500/20', label: '활성' },
  archived:    { dotClass: 'bg-muted-foreground/50',           textClass: 'text-muted-foreground',      bgClass: 'bg-muted border-border',                 label: '보관됨' },
  pending:     { dotClass: 'bg-yellow-500',                    textClass: 'text-yellow-600',            bgClass: 'bg-yellow-500/10 border-yellow-500/20',   label: '대기' },
  in_progress: { dotClass: 'bg-blue-500',                      textClass: 'text-blue-600',              bgClass: 'bg-blue-500/10 border-blue-500/20',       label: '진행중' },
  completed:   { dotClass: 'bg-emerald-500',                   textClass: 'text-emerald-600',           bgClass: 'bg-emerald-500/10 border-emerald-500/20', label: '완료' },
  failed:      { dotClass: 'bg-destructive',                   textClass: 'text-destructive',           bgClass: 'bg-destructive/10 border-destructive/20', label: '실패' },
};

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const c = CONFIG[status] || CONFIG.offline;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        c.bgClass,
        c.textClass,
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      )}
    >
      <span className={cn('rounded-full flex-shrink-0', c.dotClass, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {c.label}
    </span>
  );
}
