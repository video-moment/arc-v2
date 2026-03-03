'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LearningStats, FlaggedItem, ConfidenceHistory } from '@/lib/arc-types';
import { getPromotionTier } from '@/lib/arc-types';
import {
  getLearningStats,
  getPromotionQueue,
  promoteFlag,
  getConfidenceHistory,
  triggerAnalysis,
} from '@/lib/arc-admin-api';

const TIER_STYLE: Record<string, { color: string; soft: string }> = {
  candidate: { color: 'var(--text-tertiary)', soft: 'var(--bg-hover)' },
  warn: { color: 'var(--yellow)', soft: 'var(--yellow-soft)' },
  semi_ban: { color: 'var(--accent)', soft: 'var(--accent-soft)' },
  confirmed: { color: 'var(--green)', soft: 'var(--green-soft)' },
};

const TIER_LABEL: Record<string, string> = {
  candidate: '후보',
  warn: '주의',
  semi_ban: '준차단',
  confirmed: '확정',
};

const REASON_LABEL: Record<string, string> = {
  repeated_flag: '반복 플래그',
  negative_feedback: '부정 피드백',
  positive_context: '긍정 맥락',
  human_confirm: '관리자 확정',
  human_reject: '관리자 기각',
  pattern_discovery: '패턴 발견',
};

interface LearningOverviewProps {
  domainId: string;
}

export function LearningOverview({ domainId }: LearningOverviewProps) {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [queue, setQueue] = useState<FlaggedItem[]>([]);
  const [confidenceHistory, setConfidenceHistory] = useState<ConfidenceHistory[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const refresh = useCallback(async () => {
    const [s, q] = await Promise.all([
      getLearningStats(domainId).catch(() => null),
      getPromotionQueue(domainId).catch(() => []),
    ]);
    setStats(s);
    setQueue(q);
  }, [domainId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handlePromote = async (flagId: string, action: 'confirm' | 'reject') => {
    await promoteFlag(flagId, action);
    refresh();
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await triggerAnalysis(domainId);
      refresh();
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewHistory = async (flagId: string) => {
    const history = await getConfidenceHistory(flagId);
    setConfidenceHistory(history);
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MiniCard label="전체 추론" value={stats.totalTraces} />
          <MiniCard label="평균 품질" value={stats.avgTraceQuality.toFixed(2)} />
          <MiniCard label="피드백 수" value={stats.totalFeedback} />
          <MiniCard label="긍정 비율" value={(stats.positiveFeedbackRate * 100).toFixed(0) + '%'} />
          <MiniCard label="승격 대기" value={stats.promotionQueue} highlight={stats.promotionQueue > 0} />
        </div>
      )}

      {/* Trigger analysis */}
      <div className="flex justify-end">
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="text-[11px] px-4 py-1.5 rounded-md transition-colors font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {analyzing ? '분석 중...' : '수동 분석 실행'}
        </button>
      </div>

      {/* Promotion queue */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
          승격 대기열 <span style={{ opacity: 0.6 }}>(신뢰도 0.7 ~ 0.85)</span>
        </h3>
        {queue.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            대기 중인 플래그가 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {queue.map(flag => {
              const tier = getPromotionTier(flag.confidence);
              const tierStyle = TIER_STYLE[tier] || TIER_STYLE.candidate;
              const sevColor = flag.severity === 'error' ? 'var(--red)' : flag.severity === 'warning' ? 'var(--yellow)' : 'var(--blue)';
              const sevSoft = flag.severity === 'error' ? 'var(--red-soft)' : flag.severity === 'warning' ? 'var(--yellow-soft)' : 'var(--blue-soft)';

              return (
                <div
                  key={flag.id}
                  className="flex items-center gap-3 rounded-xl p-3.5 transition-colors group"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: sevSoft, color: sevColor, border: '1px solid ' + sevColor + '30' }}
                      >
                        {flag.severity === 'error' ? '오류' : flag.severity === 'warning' ? '경고' : '정보'}
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {flag.category}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                        신뢰도 {(flag.confidence * 100).toFixed(0)}%
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: tierStyle.soft, color: tierStyle.color, border: '1px solid ' + tierStyle.color + '30' }}
                      >
                        {TIER_LABEL[tier]}
                      </span>
                    </div>
                    <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {flag.content}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleViewHistory(flag.id)}
                      className="text-[10px] px-2.5 py-1 rounded-md transition-colors"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
                    >
                      이력
                    </button>
                    <button
                      onClick={() => handlePromote(flag.id, 'confirm')}
                      className="text-[10px] px-2.5 py-1 rounded-md transition-colors font-medium"
                      style={{ background: 'var(--green)', color: '#fff' }}
                    >
                      확정
                    </button>
                    <button
                      onClick={() => handlePromote(flag.id, 'reject')}
                      className="text-[10px] px-2.5 py-1 rounded-md transition-colors font-medium"
                      style={{ background: 'var(--red)', color: '#fff' }}
                    >
                      기각
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confidence history */}
      {confidenceHistory.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            신뢰도 변경 이력
          </h3>
          <div className="glass overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                  <th className="text-left p-3 font-medium">사유</th>
                  <th className="text-left p-3 font-medium">이전</th>
                  <th className="text-left p-3 font-medium">변경</th>
                  <th className="text-left p-3 font-medium">상세</th>
                  <th className="text-left p-3 font-medium">시각</th>
                </tr>
              </thead>
              <tbody>
                {confidenceHistory.map(change => (
                  <tr
                    key={change.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="p-3 font-medium" style={{ color: 'var(--accent-hover)' }}>
                      {REASON_LABEL[change.reason] || change.reason}
                    </td>
                    <td className="p-3 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {change.previousConfidence.toFixed(2)}
                    </td>
                    <td
                      className="p-3 tabular-nums font-medium"
                      style={{ color: change.newConfidence > change.previousConfidence ? 'var(--red)' : 'var(--green)' }}
                    >
                      {change.newConfidence > change.previousConfidence ? '\u2191' : '\u2193'} {change.newConfidence.toFixed(2)}
                    </td>
                    <td className="p-3 truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>
                      {change.details || '\u2014'}
                    </td>
                    <td className="p-3 tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(change.createdAt).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl p-3.5 transition-colors"
      style={{
        border: '1px solid ' + (highlight ? 'var(--accent)' : 'var(--border-subtle)'),
        background: highlight ? 'var(--accent-soft)' : 'var(--bg-hover)',
      }}
    >
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      <p
        className="text-xl font-bold mt-1 tracking-tight"
        style={{ color: highlight ? 'var(--accent-hover)' : 'var(--text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}
