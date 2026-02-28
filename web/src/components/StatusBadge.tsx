interface Props {
  status: string;
  size?: 'sm' | 'md';
}

const CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  online:      { bg: 'var(--green-soft)',  color: 'var(--green)',          label: '온라인' },
  offline:     { bg: 'rgba(113,113,122,0.12)', color: 'var(--text-tertiary)', label: '오프라인' },
  error:       { bg: 'var(--red-soft)',    color: 'var(--red)',            label: '오류' },
  active:      { bg: 'var(--green-soft)',  color: 'var(--green)',          label: '활성' },
  archived:    { bg: 'rgba(113,113,122,0.12)', color: 'var(--text-tertiary)', label: '보관됨' },
  pending:     { bg: 'var(--yellow-soft)', color: 'var(--yellow)',         label: '대기' },
  in_progress: { bg: 'var(--blue-soft)',   color: 'var(--blue)',           label: '진행중' },
  completed:   { bg: 'var(--green-soft)',  color: 'var(--green)',          label: '완료' },
  failed:      { bg: 'var(--red-soft)',    color: 'var(--red)',            label: '실패' },
};

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const c = CONFIG[status] || CONFIG.offline;
  const isOnline = status === 'online';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className={`rounded-full ${isOnline ? 'animate-pulse-dot' : ''} ${
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
        }`}
        style={{ background: c.color }}
      />
      {c.label}
    </span>
  );
}
