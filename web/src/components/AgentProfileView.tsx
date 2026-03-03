'use client';

import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAgentProfile, getProfileHistory, type AgentProfileSection, type AgentProfileHistory } from '@/lib/api';

interface AgentProfileViewProps {
  agentId: string;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

const SECTION_ICONS: Record<string, string> = {
  persona: '🎭',
  instructions: '📋',
  capabilities: '⚡',
  goals: '🎯',
  changelog: '📜',
  context: '🧠',
  rules: '📏',
};

function SectionCard({
  section,
  defaultOpen,
}: {
  section: AgentProfileSection;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AgentProfileHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const icon = SECTION_ICONS[section.sectionKey] || '📄';

  const handleShowHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    if (history.length === 0) {
      setLoadingHistory(true);
      try {
        const h = await getProfileHistory(section.id);
        setHistory(h);
      } catch (e) {
        console.error(e);
      }
      setLoadingHistory(false);
    }
    setShowHistory(true);
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:brightness-105"
        style={{ background: open ? 'var(--bg-hover)' : 'transparent' }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform shrink-0"
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-sm">{icon}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {section.title || section.sectionKey}
        </span>
        <span className="ml-auto text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          v{section.version} · {timeAgo(section.updatedAt)}
        </span>
      </button>

      {/* Content */}
      {open && (
        <div className="px-4 pb-4">
          <div
            className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ReactMarkdown>{section.content}</ReactMarkdown>
          </div>

          {/* History toggle */}
          {section.version > 1 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={handleShowHistory}
                className="text-[11px] cursor-pointer transition-colors hover:brightness-125"
                style={{ color: 'var(--accent)' }}
              >
                {showHistory ? '히스토리 닫기' : `이전 버전 보기 (${section.version - 1}개)`}
              </button>

              {showHistory && (
                <div className="mt-2 space-y-2">
                  {loadingHistory ? (
                    <div className="flex items-center gap-2 py-2">
                      <div
                        className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                      />
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        불러오는 중...
                      </span>
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      히스토리가 없습니다
                    </p>
                  ) : (
                    history.map((h) => (
                      <details
                        key={h.id}
                        className="rounded-lg overflow-hidden"
                        style={{ background: 'var(--bg-hover)' }}
                      >
                        <summary
                          className="px-3 py-2 text-[11px] cursor-pointer"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          v{h.version} · {timeAgo(h.createdAt)}
                        </summary>
                        <div
                          className="px-3 pb-2 text-[11px] leading-relaxed whitespace-pre-wrap"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {h.content}
                        </div>
                      </details>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentProfileView({ agentId }: AgentProfileViewProps) {
  const [sections, setSections] = useState<AgentProfileSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAgentProfile(agentId);
        setSections(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  // 변경 로그: 모든 섹션의 최근 업데이트를 시간순으로
  const recentChanges = useMemo(() => {
    return [...sections]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }, [sections]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-20 justify-center">
        <div
          className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          프로필 불러오는 중...
        </span>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="text-center py-20">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span className="text-2xl opacity-40">🤖</span>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          아직 프로필을 등록하지 않았습니다
        </p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          에이전트가 MCP arc_update_profile 도구로 자신의 페르소나, 지침, 능력 등을 업로드하면 여기에 표시됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {sections.map((s, i) => (
        <SectionCard key={s.id} section={s} defaultOpen={i < 3} />
      ))}

      {/* 변경 타임라인 */}
      {recentChanges.length > 0 && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            📜 최근 변경
          </h3>
          <div className="space-y-1.5">
            {recentChanges.map((s) => (
              <div key={s.id + '-change'} className="flex items-center gap-2 text-[11px]">
                <span style={{ color: 'var(--accent)' }}>v{s.version}</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {s.title || s.sectionKey} 업데이트
                </span>
                <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                  {timeAgo(s.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
