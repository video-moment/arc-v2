'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FeedbackLog } from '@/lib/arc-types';
import { getFeedbackLogs } from '@/lib/arc-admin-api';

interface FeedbackListProps {
  domainId: string;
}

export function FeedbackList({ domainId }: FeedbackListProps) {
  const [logs, setLogs] = useState<FeedbackLog[]>([]);

  const refresh = useCallback(async () => {
    const data = await getFeedbackLogs(domainId).catch(() => []);
    setLogs(data);
  }, [domainId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
        피드백 로그
      </h3>
      {logs.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
          아직 피드백이 없습니다
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div
              key={log.id}
              className="rounded-xl p-3.5 transition-colors"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-sm font-bold"
                  style={{ color: log.feedbackType === 'thumbs_up' ? 'var(--green)' : 'var(--red)' }}
                >
                  {log.feedbackType === 'thumbs_up' ? '\u25B2' : '\u25BC'}
                </span>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {log.sessionId.slice(0, 8)}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {log.domainId}
                </span>
                <span className="text-[10px] ml-auto tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(log.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>

              {log.comment && (
                <p className="text-sm leading-relaxed mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  &ldquo;{log.comment}&rdquo;
                </p>
              )}

              {log.learningAction && (
                <p className="text-[10px] font-mono mb-1.5" style={{ color: 'var(--accent-hover)', opacity: 0.8 }}>
                  학습: {log.learningAction}
                </p>
              )}

              {log.flaggedExpressions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {log.flaggedExpressions.map((expr, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {expr.slice(0, 50)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
