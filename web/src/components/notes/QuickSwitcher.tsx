'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { NotePage } from '@/lib/api';
import NoteIcon from './NoteIcon';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from '@/components/ui/command';

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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
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

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx, open]);

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

  // Global keyboard shortcut to close on Escape when overlay is clicked
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIdx]) {
          onSelectPage(results[selectedIdx]);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selectedIdx, onClose, onSelectPage]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="w-[480px] max-h-[60vh] rounded-xl overflow-hidden shadow-2xl border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="페이지 검색... (제목, 내용)"
              className="flex-1 bg-transparent outline-none text-sm h-auto border-0 p-0 focus:ring-0"
              autoFocus
            />
            <kbd className="px-1.5 py-0.5 rounded text-[10px] shrink-0 bg-muted border text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results list */}
          <CommandList
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight: 'calc(60vh - 52px - 32px)' }}
          >
            {results.length === 0 ? (
              <CommandEmpty className="px-4 py-8 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((p, i) => {
                  const preview = query.trim() ? getContentPreview(p.content, query) : '';
                  return (
                    <CommandItem
                      key={p.id}
                      onSelect={() => { onSelectPage(p); onClose(); }}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={`flex flex-col gap-0.5 px-4 py-2.5 cursor-pointer ${i === selectedIdx ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <NoteIcon name={p.emoji} size={14} className="text-muted-foreground/60" />
                        <span className="text-sm font-medium truncate flex-1">
                          {p.title}
                        </span>
                        <span className="text-[11px] ml-auto shrink-0 text-muted-foreground">
                          <NoteIcon name={p.groupEmoji} size={11} className="inline" /> {p.groupName}
                        </span>
                      </div>
                      {preview && (
                        <span className="text-[11px] truncate pl-5 text-muted-foreground">
                          {preview}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer hint */}
          <div className="flex items-center gap-4 px-4 py-2 text-[10px] border-t text-muted-foreground">
            <span>↑↓ 탐색</span>
            <span>↵ 열기</span>
            <span>ESC 닫기</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
