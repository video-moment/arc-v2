'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionInfo } from '@/lib/arc-types';
import { getSessions } from '@/lib/arc-admin-api';

const STATUS_MAP: Record<string, { color: string; label: string; pulse?: boolean }> = {
  running: { color: 'var(--green)', label: '실행중', pulse: true },
  completed: { color: 'var(--blue)', label: '완료' },
  error: { color: 'var(--red)', label: '오류' },
  paused: { color: 'var(--yellow)', label: '일시정지' },
  idle: { color: 'var(--text-tertiary)', label: '대기' },
};

interface SessionListProps {
  domainId: string;
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
  onFirstLoad?: (firstSessionId: string) => void;
}

export function SessionList({ domainId, selectedId, onSelect, onFirstLoad }: SessionListProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const firstLoadFired = useRef(false);

  const refresh = useCallback(async () => {
    const data = await getSessions(domainId).catch(() => []);
    setSessions(data);
    // Auto-select first session on initial load
    if (!firstLoadFired.current && data.length > 0 && onFirstLoad) {
      firstLoadFired.current = true;
      onFirstLoad(data[0].sessionId);
    }
  }, [domainId, onFirstLoad]);

  useEffect(() => {
    firstLoadFired.current = false;
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const errorCount = sessions.filter(s => s.status === 'error').length;
  const completedCount = sessions.filter(s => s.status === 'completed').length;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
        세션 목록 <span style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>({sessions.length})</span>
      </h3>
      {sessions.length > 0 && (
        <div className="text-[10px] mb-3 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
          <span style={{ color: 'var(--red)' }}>{errorCount}개 오류</span>
          <span>/</span>
          <span style={{ color: 'var(--blue)' }}>{completedCount}개 완료</span>
        </div>
      )}
      {sessions.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          세션이 없습니다
        </p>
      )}
      <div className="space-y-1">
        {sessions.map(s => {
          const status = STATUS_MAP[s.status] || STATUS_MAP.idle;
          const isSelected = selectedId === s.sessionId;
          return (
            <button
              key={s.sessionId}
              onClick={() => onSelect(s.sessionId)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={e => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.pulse ? 'animate-pulse-dot' : ''}`}
                  style={{ background: status.color }}
                />
                <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {s.sessionId.slice(0, 8)}
                </span>
                <span className="text-[10px]" style={{ color: status.color }}>
                  {status.label}
                </span>
                <span className="text-[10px] ml-auto tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(s.createdAt).toLocaleString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
