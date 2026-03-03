export default function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
      <div className="text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-30">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm mb-1">페이지를 선택하거나</p>
        <p className="text-sm">새 그룹을 만들어 시작하세요</p>
        <p className="text-[11px] mt-3" style={{ color: 'var(--text-tertiary)' }}>
          <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>⌘K</kbd>
          {' '}빠른 검색
        </p>
      </div>
    </div>
  );
}
