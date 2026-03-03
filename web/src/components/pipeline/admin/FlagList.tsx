'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FlaggedItem, FlagStatus } from '@/lib/arc-types';
import { getFlags, resolveFlag } from '@/lib/arc-admin-api';

const SEVERITY: Record<string, { borderColor: string; bgColor: string; label: string }> = {
  error: { borderColor: 'var(--red)', bgColor: 'var(--red-soft)', label: '오류' },
  warning: { borderColor: 'var(--yellow)', bgColor: 'var(--yellow-soft)', label: '경고' },
  info: { borderColor: 'var(--blue)', bgColor: 'var(--blue-soft)', label: '정보' },
};

const STATUS_BADGE: Record<string, { bgColor: string; color: string; label: string }> = {
  pending: { bgColor: 'var(--yellow-soft)', color: 'var(--yellow)', label: '대기중' },
  approved: { bgColor: 'var(--green-soft)', color: 'var(--green)', label: '승인' },
  rejected: { bgColor: 'var(--red-soft)', color: 'var(--red)', label: '기각' },
};

type FilterTab = 'all' | FlagStatus;

interface FlagListProps {
  domainId: string;
}

export function FlagList({ domainId }: FlagListProps) {
  const [flags, setFlags] = useState<FlaggedItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');

  const refresh = useCallback(async () => {
    const status = filter === 'all' ? undefined : filter;
    const data = await getFlags({ domainId, status }).catch(() => []);
    setFlags(data);
  }, [domainId, filter]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleResolve = async (flagId: string, status: 'approved' | 'rejected') => {
    await resolveFlag(flagId, status);
    refresh();
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'pending', label: '대기' },
    { key: 'approved', label: '승인' },
    { key: 'rejected', label: '거부' },
  ];

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {filterTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className="px-3 py-2 text-xs font-medium transition-all"
            style={{
              borderBottom: filter === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: filter === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[10px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
          {flags.length}건
        </span>
      </div>

      {flags.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          플래그가 없습니다
        </p>
      )}

      <div className="space-y-2">
        {flags.map(flag => {
          const sev = SEVERITY[flag.severity] || SEVERITY.info;
          const st = STATUS_BADGE[flag.status] || STATUS_BADGE.pending;

          return (
            <div
              key={flag.id}
              className="p-3 rounded-r-lg"
              style={{
                borderLeft: '2px solid ' + sev.borderColor,
                background: sev.bgColor,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {flag.category}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: st.bgColor, color: st.color, border: '1px solid ' + st.color + '30' }}
                >
                  {st.label}
                </span>
                {/* Confidence bar */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-16 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-hover)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: (flag.confidence * 100) + '%',
                        background: flag.confidence >= 0.7 ? 'var(--green)' : flag.confidence >= 0.4 ? 'var(--yellow)' : 'var(--red)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                    {(flag.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <span
                  className="text-[10px] ml-auto font-mono"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {flag.sessionId.slice(0, 8)}
                </span>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {flag.content}
              </p>
              {flag.context && (
                <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
                  맥락: {flag.context}
                </p>
              )}

              {flag.status === 'pending' && (
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => handleResolve(flag.id, 'approved')}
                    className="text-[11px] px-3 py-1 rounded-md transition-colors font-medium"
                    style={{ background: 'var(--green)', color: '#fff' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleResolve(flag.id, 'rejected')}
                    className="text-[11px] px-3 py-1 rounded-md transition-colors font-medium"
                    style={{ background: 'var(--red)', color: '#fff' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    기각
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
