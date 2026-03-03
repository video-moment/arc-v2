'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { NotePage } from '@/lib/api';

interface GroupWithPages {
  id: string;
  name: string;
  emoji: string;
  pages: NotePage[];
}

interface QuickSwitcherProps {
  open: boolean;
  groups: GroupWithPages[];
  onClose: () => void;
  onSelectPage: (page: NotePage) => void;
}

export default function QuickSwitcher({ open, groups, onClose, onSelectPage }: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allPages = useMemo(() => {
    return groups.flatMap(g =>
      g.pages.map(p => ({ ...p, groupName: g.name, groupEmoji: g.emoji }))
    );
  }, [groups]);

  const results = useMemo(() => {
    if (!query.trim()) return allPages.slice(0, 10);
    const q = query.toLowerCase();
    return allPages
      .filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.groupName.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, allPages]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const getContentPreview = (content: string, q: string): string => {
    if (!q.trim() || !content) return '';
    const lower = content.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) return '';
    const start = Math.max(0, idx - 20);
    const end = Math.min(content.length, idx + q.length + 40);
    let preview = content.slice(start, end).replace(/\n/g, ' ');
    if (start > 0) preview = '...' + preview;
    if (end < content.length) preview = preview + '...';
    return preview;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIdx]) {
        onSelectPage(results[selectedIdx]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: 480,
          maxHeight: '60vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
            placeholder="페이지 검색... (제목, 내용)"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] shrink-0" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
            ESC
          </kbd>
        </div>

        {/* 결과 목록 */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 52px)' }}>
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              검색 결과가 없습니다
            </div>
          )}
          {results.map((p, i) => {
            const preview = query.trim() ? getContentPreview(p.content, query) : '';
            return (
              <div
                key={p.id}
                className="flex flex-col gap-0.5 px-4 py-2.5 cursor-pointer transition-colors"
                style={{
                  background: i === selectedIdx ? 'var(--accent-soft)' : 'transparent',
                }}
                onClick={() => { onSelectPage(p); onClose(); }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">{p.emoji}</span>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {p.title}
                  </span>
                  <span className="text-[11px] ml-auto shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {p.groupEmoji} {p.groupName}
                  </span>
                </div>
                {preview && (
                  <span className="text-[11px] truncate pl-5" style={{ color: 'var(--text-tertiary)' }}>
                    {preview}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 하단 힌트 */}
        <div className="flex items-center gap-4 px-4 py-2 text-[10px]" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
          <span>↑↓ 탐색</span>
          <span>↵ 열기</span>
          <span>ESC 닫기</span>
        </div>
      </div>
    </div>
  );
}
