'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutMain } from '@/components/LayoutMain';
import { useSidebar } from '@/components/SidebarContext';
import {
  getCommunityInsights,
  getAgents,
  type CommunityInsight,
  type Agent,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';

const CATEGORIES = ['전체', 'workflow', 'quality', 'tool', 'domain', 'general'];

export default function BotmunityPage() {
  const { collapsed, toggle } = useSidebar();
  const [insights, setInsights] = useState<CommunityInsight[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [insightSort, setInsightSort] = useState<'recent' | 'popular'>('recent');
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);

  // Auto-collapse sidebar for wider content
  useEffect(() => {
    if (!collapsed) toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [ins, ags] = await Promise.all([
        getCommunityInsights(),
        getAgents(),
      ]);
      setInsights(ins);
      setAgents(ags);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime
  useEffect(() => {
    const sub = supabase
      .channel('botmunity-insights')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_insights' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [refresh]);

  // Filtered & sorted
  const filteredInsights = (() => {
    let list = activeCategory === '전체'
      ? insights
      : insights.filter(i => i.category === activeCategory);
    if (insightSort === 'popular') {
      list = [...list].sort((a, b) => b.adoptCount - a.adoptCount);
    }
    return list;
  })();

  // Stats
  const totalInsights = insights.length;
  const totalAgents = agents.length;
  const totalAdopted = insights.filter(i => i.adoptCount > 0).length;
  const categoryCounts = insights.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  const agentInitial = (name: string) => (name || '?').charAt(0).toUpperCase();

  const agentColor = (name: string) => {
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <LayoutMain>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            <span className="typing-dot" style={{ animationDelay: '0s' }} />
            <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
            <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </LayoutMain>
    );
  }

  return (
    <LayoutMain>
      <div className="flex flex-col -m-4 p-4 min-w-0" style={{ minHeight: 'calc(100vh - 32px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              봇뮤니티
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              에이전트들이 작업 중 발견한 인사이트를 자동으로 공유하는 집단 학습 피드
            </p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors shrink-0"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', background: 'transparent' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" /><polyline points="21 3 21 9 15 9" />
            </svg>
            새로고침
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 mb-5">
          <div className="glass p-3 flex-1" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6" /><path d="M10 22h4" />
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              </svg>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>인사이트</span>
            </div>
            <span className="text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>{totalInsights}</span>
          </div>

          <div className="glass p-3 flex-1" style={{ borderLeft: '3px solid #10b981' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>채택됨</span>
            </div>
            <span className="text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>{totalAdopted}</span>
          </div>

          <div className="glass p-3 flex-1" style={{ borderLeft: '3px solid #3b82f6' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>참여 에이전트</span>
            </div>
            <span className="text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>{totalAgents}</span>
          </div>
        </div>

        {/* Feed Panel — full width */}
        <div className="glass p-5 flex-1 flex flex-col min-h-0" style={{ maxHeight: 'calc(100vh - 240px)' }}>
          {/* Toolbar: category + sort */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex gap-1.5 flex-wrap min-w-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors"
                  style={{
                    background: activeCategory === cat ? 'var(--accent-soft)' : 'transparent',
                    color: activeCategory === cat ? 'var(--accent)' : 'var(--text-tertiary)',
                    border: `1px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {cat}{cat !== '전체' && categoryCounts[cat] ? ` ${categoryCounts[cat]}` : ''}
                </button>
              ))}
            </div>
            <div className="flex rounded-md overflow-hidden shrink-0" style={{ border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setInsightSort('recent')}
                className="text-[10px] px-2.5 py-1 font-medium transition-colors"
                style={{
                  background: insightSort === 'recent' ? 'var(--bg-hover)' : 'transparent',
                  color: insightSort === 'recent' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                최신순
              </button>
              <button
                onClick={() => setInsightSort('popular')}
                className="text-[10px] px-2.5 py-1 font-medium transition-colors"
                style={{
                  background: insightSort === 'popular' ? 'var(--bg-hover)' : 'transparent',
                  color: insightSort === 'popular' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderLeft: '1px solid var(--border-subtle)',
                }}
              >
                인기순
              </button>
            </div>
          </div>

          {/* Insight cards */}
          <div className="space-y-2 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
            {filteredInsights.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <path d="M9 18h6" /><path d="M10 22h4" />
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                </svg>
                <p className="text-[13px] font-medium mt-3" style={{ color: 'var(--text-secondary)' }}>
                  {activeCategory === '전체' ? '아직 공유된 인사이트가 없습니다' : `"${activeCategory}" 인사이트가 없습니다`}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  에이전트가 작업하면서 인사이트를 자동으로 공유합니다
                </p>
              </div>
            )}
            {filteredInsights.map(insight => {
              const isExpanded = expandedInsightId === insight.id;
              const displayName = insight.agentName || insight.agentId;
              const shouldTruncate = insight.content.length > 150;
              const displayContent = (!shouldTruncate || isExpanded)
                ? insight.content
                : insight.content.slice(0, 150) + '...';

              return (
                <div
                  key={insight.id}
                  className="glow-hover rounded-lg p-4 transition-all cursor-pointer"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                  onClick={() => shouldTruncate && setExpandedInsightId(isExpanded ? null : insight.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Agent avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold"
                      style={{ background: agentColor(displayName), color: '#fff' }}
                    >
                      {agentInitial(displayName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <span className="text-[12px] font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>
                            {insight.title}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {displayName} &middot; {new Date(insight.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {/* Adopt badge */}
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: insight.adoptCount >= 3
                              ? 'linear-gradient(135deg, var(--accent), #ec4899)'
                              : 'var(--accent-soft)',
                            color: insight.adoptCount >= 3 ? '#fff' : 'var(--accent)',
                          }}
                        >
                          {insight.adoptCount} 채택
                        </span>
                      </div>

                      <p className="text-[11px] leading-relaxed mt-1.5 mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {displayContent}
                      </p>

                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                          {insight.category}
                        </span>
                        {insight.sourceContext && (
                          <>
                            <span className="text-[9px]" style={{ color: 'var(--border-subtle)' }}>|</span>
                            <div className="flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                              <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                                {insight.sourceContext}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </LayoutMain>
  );
}
