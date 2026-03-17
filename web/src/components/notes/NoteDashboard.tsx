'use client';

import { useMemo, useState } from 'react';
import type { NoteCategory, NotePage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FileText, ArrowLeft } from 'lucide-react';
import NoteIcon from './NoteIcon';

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
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  type PageWithGroup = NotePage & { groupName: string; groupEmoji: string };

  const allPages = useMemo((): PageWithGroup[] => {
    return groups.flatMap(g => g.pages.map(p => ({ ...p, groupName: g.name, groupEmoji: g.emoji })));
  }, [groups]);

  const recentPages = useMemo(() => {
    return [...allPages]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [allPages]);

  const now = new Date();

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
    if (!content) return '';
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
    return text.length > 150 ? text.slice(0, 150) + '...' : text;
  };

  // Empty state
  if (allPages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-accent/50">
            <FileText className="w-7 h-7 text-muted-foreground/30" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">아직 노트가 없어요</p>
          <p className="text-xs text-muted-foreground/50">왼쪽에서 그룹을 만들고 노트를 작성하세요</p>
        </div>
      </div>
    );
  }

  // Category detail
  if (selectedCatId !== null) {
    const isUncategorized = selectedCatId === 'uncategorized';
    const cat = isUncategorized ? null : categories.find(c => c.id === selectedCatId);
    const filteredPages = isUncategorized
      ? allPages.filter(p => !p.categoryId)
      : allPages.filter(p => p.categoryId === selectedCatId);
    const sorted = [...filteredPages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <button
            onClick={() => setSelectedCatId(null)}
            className="flex items-center gap-1.5 mb-8 text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            돌아가기
          </button>

          <div className="flex items-center gap-3 mb-8">
            <span className="w-3 h-3 rounded-full" style={{ background: cat?.color ?? 'var(--text-tertiary)' }} />
            <h1 className="text-lg font-bold">{isUncategorized ? '미분류' : cat?.name}</h1>
            <span className="text-xs text-muted-foreground/50">{sorted.length}개</span>
          </div>

          <div className="space-y-1">
            {sorted.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onSelectPage(p)}
              >
                <NoteIcon name={p.emoji} size={16} className="text-muted-foreground/60" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground/50 truncate mt-0.5">{getPreview(p.content)}</p>
                </div>
                <span className="text-[11px] text-muted-foreground/40 shrink-0">{relativeTime(p.updatedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard — clean recent list
  const uncategorizedCount = allPages.filter(p => !p.categoryId).length;

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40">
      <div className="max-w-2xl mx-auto px-8 py-10">

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {categories.map(cat => {
              const count = allPages.filter(p => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                  <span className="text-[13px] font-medium">{cat.name}</span>
                  <span className="text-[11px] text-muted-foreground/40 tabular-nums">{count}</span>
                </button>
              );
            })}
            {uncategorizedCount > 0 && (
              <button
                onClick={() => setSelectedCatId('uncategorized')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <span className="text-[13px] font-medium">미분류</span>
                <span className="text-[11px] text-muted-foreground/40 tabular-nums">{uncategorizedCount}</span>
              </button>
            )}
          </div>
        )}

        {/* Recent notes */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground/40 uppercase tracking-wider mb-3">
            최근 수정
          </h2>
          <div className="space-y-2">
            {recentPages.map(p => {
              const cat = categories.find(c => c.id === p.categoryId);
              return (
                <div
                  key={p.id}
                  className="group px-5 py-4 rounded-xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all"
                  onClick={() => onSelectPage(p)}
                >
                  <p className="text-[14px] font-semibold text-foreground truncate mb-1">{p.title}</p>
                  <p className="text-[12.5px] text-muted-foreground/70 leading-[1.6] line-clamp-2 mb-2">
                    {getPreview(p.content) || '내용 없음'}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
                    <span className="flex items-center gap-1"><NoteIcon name={p.groupEmoji} size={10} /> {p.groupName}</span>
                    <span className="opacity-30">·</span>
                    <span className="tabular-nums">{relativeTime(p.updatedAt)}</span>
                    {cat && (
                      <>
                        <span className="opacity-30">·</span>
                        <span style={{ color: cat.color }}>{cat.name}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
