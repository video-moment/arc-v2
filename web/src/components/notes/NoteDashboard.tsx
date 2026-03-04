'use client';

import { useMemo, useState } from 'react';
import type { NoteCategory, NotePage } from '@/lib/api';

interface GroupWithPages {
  id: string;
  name: string;
  emoji: string;
  pages: NotePage[];
}

interface NoteDashboardProps {
  groups: GroupWithPages[];
  categories: NoteCategory[];
  onSelectPage: (page: NotePage) => void;
}

export default function NoteDashboard({ groups, categories, onSelectPage }: NoteDashboardProps) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null); // null = 대시보드, 'uncategorized' = 미분류

  const allPages = useMemo(() => {
    return groups.flatMap(g => g.pages.map(p => ({ ...p, groupName: g.name, groupEmoji: g.emoji })));
  }, [groups]);

  const totalPages = allPages.length;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayPages = allPages.filter(p => new Date(p.updatedAt) >= todayStart);

  // 최근 수정 8개
  const recentPages = useMemo(() => {
    return [...allPages]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [allPages]);

  // 카테고리별 분류
  const categoryPages = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      pages: allPages
        .filter(p => p.categoryId === cat.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
      total: allPages.filter(p => p.categoryId === cat.id).length,
    }));
  }, [categories, allPages]);

  const uncategorizedCount = allPages.filter(p => !p.categoryId).length;

  const relativeTime = (dateStr: string) => {
    const diff = now.getTime() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getPreview = (content: string) => {
    if (!content) return '내용 없음';
    // 마크다운 문법 제거하여 순수 텍스트 추출
    const text = content
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    return text.length > 120 ? text.slice(0, 120) + '...' : text;
  };

  if (totalPages === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-30">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-sm mb-1">노트가 아직 없습니다</p>
          <p className="text-sm">왼쪽에서 그룹을 만들어 시작하세요</p>
        </div>
      </div>
    );
  }

  // 카테고리 상세 뷰
  if (selectedCatId !== null) {
    const isUncategorized = selectedCatId === 'uncategorized';
    const cat = isUncategorized ? null : categories.find(c => c.id === selectedCatId);
    const filteredPages = isUncategorized
      ? allPages.filter(p => !p.categoryId)
      : allPages.filter(p => p.categoryId === selectedCatId);
    const sorted = [...filteredPages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {/* 뒤로가기 헤더 */}
          <button
            onClick={() => setSelectedCatId(null)}
            className="flex items-center gap-2 mb-6 text-sm transition-colors cursor-pointer"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            대시보드로 돌아가기
          </button>

          {/* 카테고리 제목 */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className="w-4 h-4 rounded-full"
              style={{ background: cat?.color ?? 'var(--text-tertiary)' }}
            />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {isUncategorized ? '미분류' : cat?.name}
            </h1>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {sorted.length}개 노트
            </span>
          </div>

          {/* 노트 목록 */}
          {sorted.length === 0 ? (
            <p className="text-sm py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
              이 카테고리에 노트가 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {sorted.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  onClick={() => onSelectPage(p)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span className="text-xl flex-shrink-0">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {p.title}
                    </p>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{
                        color: 'var(--text-tertiary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {getPreview(p.content)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 gap-1">
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {(p as any).groupEmoji} {(p as any).groupName}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {relativeTime(p.updatedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">

        {/* 상단 통계 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div
            className="rounded-xl px-5 py-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalPages}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>전체 노트</p>
          </div>
          <div
            className="rounded-xl px-5 py-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <p className="text-2xl font-bold" style={{ color: 'var(--accent-hover)' }}>{todayPages.length}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>오늘 활동</p>
          </div>
          <div
            className="rounded-xl px-5 py-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{groups.length}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>그룹</p>
          </div>
        </div>

        {/* 카테고리 블록 */}
        {categories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>카테고리</h2>
            <div className="grid grid-cols-2 gap-3">
              {categoryPages.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className="rounded-xl px-5 py-5 text-left cursor-pointer transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = cat.color;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: cat.color }} />
                    <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                    <span className="flex-1" />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: cat.total > 0 ? cat.color : 'var(--text-tertiary)' }}>
                    {cat.total}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {cat.total > 0 ? `최근: ${cat.pages[0]?.title ?? ''}` : '노트 없음'}
                  </p>
                </button>
              ))}
              {uncategorizedCount > 0 && (
                <button
                  onClick={() => setSelectedCatId('uncategorized')}
                  className="rounded-xl px-5 py-5 text-left cursor-pointer transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--text-tertiary)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: 'var(--text-tertiary)', opacity: 0.4 }} />
                    <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>미분류</span>
                    <span className="flex-1" />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    {uncategorizedCount}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>카테고리 미지정</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 최근 노트 카드 그리드 */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>최근 노트</h2>
          <div className="grid grid-cols-2 gap-3">
            {recentPages.map(p => {
              const cat = categories.find(c => c.id === p.categoryId);
              return (
                <div
                  key={p.id}
                  className="rounded-xl px-5 py-4 cursor-pointer transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  onClick={() => onSelectPage(p)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {/* 상단: 이모지 + 제목 */}
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg flex-shrink-0">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {p.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {cat && (
                          <span className="flex items-center gap-1 text-[11px]" style={{ color: cat.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                            {cat.name}
                          </span>
                        )}
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {(p as any).groupEmoji} {(p as any).groupName}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* 미리보기 */}
                  <p
                    className="text-xs leading-relaxed mb-2"
                    style={{ color: 'var(--text-tertiary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {getPreview(p.content)}
                  </p>
                  {/* 하단: 시간 */}
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    {relativeTime(p.updatedAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}
