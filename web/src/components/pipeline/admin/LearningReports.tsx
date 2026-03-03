'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LearningReport } from '@/lib/arc-types';
import { getLearningReports } from '@/lib/arc-admin-api';

interface LearningReportsProps {
  domainId: string;
}

export function LearningReports({ domainId }: LearningReportsProps) {
  const [reports, setReports] = useState<LearningReport[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await getLearningReports(domainId).catch(() => []);
    setReports(data);
  }, [domainId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
        학습 리포트
      </h3>
      {reports.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
          리포트가 아직 없습니다. 분석을 실행하세요.
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const isExpanded = expandedId === report.id;
            return (
              <div
                key={report.id}
                className="rounded-xl p-4 transition-colors cursor-pointer"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {report.domainId}
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(report.periodStart).toLocaleDateString('ko-KR')} &mdash; {new Date(report.periodEnd).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(report.generatedAt).toLocaleString('ko-KR')}
                    </span>
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--text-tertiary)' }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-3 pt-3"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <Stat label="추론" value={report.summary.totalTraces} />
                    <Stat label="평균 품질" value={report.summary.avgTraceQuality.toFixed(2)} />
                    <Stat label="피드백" value={report.summary.totalFeedback} />
                    <Stat label="긍정률" value={(report.summary.positiveFeedbackRate * 100).toFixed(0) + '%'} />
                    <Stat label="대기열" value={report.summary.promotionQueue} />
                    <Stat label="승격" value={report.summary.recentPromotions} />
                  </div>
                )}

                {!isExpanded && (
                  <div className="flex gap-4 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    <span>추론: <strong style={{ color: 'var(--text-secondary)' }}>{report.summary.totalTraces}</strong></span>
                    <span>품질: <strong style={{ color: 'var(--text-secondary)' }}>{report.summary.avgTraceQuality.toFixed(2)}</strong></span>
                    <span>피드백: <strong style={{ color: 'var(--text-secondary)' }}>{report.summary.totalFeedback}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>{value}</p>
    </div>
  );
}
