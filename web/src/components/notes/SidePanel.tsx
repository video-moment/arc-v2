'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { NoteCategory, NotePage } from '@/lib/api';
import CategoryManager from './CategoryManager';

interface GroupWithPages {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
  pages: (NotePage & { isPinned?: boolean })[];
  expanded: boolean;
}

interface SidePanelProps {
  groups: GroupWithPages[];
  selectedPageId: string | null;
  onSelectPage: (page: NotePage) => void;
  onCreateGroup: (name: string) => void;
  onCreatePage: (groupId: string) => void;
  onDeleteGroup: (id: string) => void;
  onDeletePage: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onTogglePin: (page: NotePage) => void;
  onReorderGroups: (groupId: string, newSortOrder: number) => void;
  onReorderPages: (pageId: string, newSortOrder: number) => void;
  // Category props
  categories: NoteCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory: (name: string, color: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
}

export default function SidePanel({
  groups,
  selectedPageId,
  onSelectPage,
  onCreateGroup,
  onCreatePage,
  onDeleteGroup,
  onDeletePage,
  onToggleGroup,
  onRenameGroup,
  onTogglePin,
  onReorderGroups,
  onReorderPages,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: SidePanelProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [recentCollapsed, setRecentCollapsed] = useState(false);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLInputElement>(null);

  // 카테고리 색상 맵
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.id, c.color));
    return map;
  }, [categories]);

  // Drag state
  const [dragType, setDragType] = useState<'group' | 'page' | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  useEffect(() => {
    if (editingGroupId) editRef.current?.focus();
  }, [editingGroupId]);

  useEffect(() => {
    if (creatingGroup) createRef.current?.focus();
  }, [creatingGroup]);

  const commitRename = () => {
    if (editingGroupId && editName.trim()) {
      onRenameGroup(editingGroupId, editName.trim());
    }
    setEditingGroupId(null);
  };

  const commitCreate = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
    }
    setCreatingGroup(false);
    setNewGroupName('');
  };

  // Recent pages: top 5 by updatedAt
  const recentPages = useMemo(() => {
    return groups
      .flatMap(g => g.pages.map(p => ({ ...p, groupName: g.name, groupEmoji: g.emoji, groupId: g.id })))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [groups]);

  // Pinned pages
  const pinnedPages = useMemo(() => {
    return groups
      .flatMap(g => g.pages.filter(p => p.isPinned).map(p => ({ ...p, groupName: g.name, groupEmoji: g.emoji, groupId: g.id })));
  }, [groups]);

  const handleSelectAndExpand = (page: NotePage) => {
    onSelectPage(page);
    // Auto-expand parent group
    const parentGroup = groups.find(g => g.id === page.groupId);
    if (parentGroup && !parentGroup.expanded) {
      onToggleGroup(parentGroup.id);
    }
  };

  // ── Drag & Drop handlers ──
  const handleDragStartGroup = (e: React.DragEvent, groupId: string) => {
    setDragType('group');
    setDragId(groupId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartPage = (e: React.DragEvent, pageId: string) => {
    setDragType('page');
    setDragId(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, rect?: DOMRect) => {
    e.preventDefault();
    if (!rect) return;
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    setDropTarget({ id: targetId, position });
  };

  const handleDragEnd = () => {
    if (dragId && dropTarget) {
      if (dragType === 'group') {
        const sorted = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
        const targetIdx = sorted.findIndex(g => g.id === dropTarget.id);
        if (targetIdx !== -1) {
          const insertIdx = dropTarget.position === 'before' ? targetIdx : targetIdx + 1;
          const prev = sorted[insertIdx - 1]?.sortOrder ?? 0;
          const next = sorted[insertIdx]?.sortOrder ?? (prev + 2);
          onReorderGroups(dragId, (prev + next) / 2);
        }
      } else if (dragType === 'page') {
        // Find target page's group and position
        for (const g of groups) {
          const pageIdx = g.pages.findIndex(p => p.id === dropTarget.id);
          if (pageIdx !== -1) {
            const sorted = [...g.pages].sort((a, b) => a.sortOrder - b.sortOrder);
            const targetSortIdx = sorted.findIndex(p => p.id === dropTarget.id);
            const insertIdx = dropTarget.position === 'before' ? targetSortIdx : targetSortIdx + 1;
            const prev = sorted[insertIdx - 1]?.sortOrder ?? 0;
            const next = sorted[insertIdx]?.sortOrder ?? (prev + 2);
            onReorderPages(dragId, (prev + next) / 2);
            break;
          }
        }
      }
    }
    setDragType(null);
    setDragId(null);
    setDropTarget(null);
  };

  const dropStyle = (id: string, position: 'before' | 'after'): React.CSSProperties => {
    if (dropTarget?.id === id && dropTarget.position === position) {
      return position === 'before'
        ? { borderTop: '2px solid var(--accent)' }
        : { borderBottom: '2px solid var(--accent)' };
    }
    return {};
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ width: 280, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>노트</span>
        <button
          onClick={() => setCreatingGroup(true)}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          title="새 그룹"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 카테고리 필터 바 */}
      {categories.length > 0 && (
        <div
          className="flex items-center gap-1 px-3 py-2 overflow-x-auto"
          style={{ borderBottom: '1px solid var(--border-subtle)', scrollbarWidth: 'none' }}
        >
          <button
            onClick={() => onSelectCategory(null)}
            className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors"
            style={{
              background: selectedCategoryId === null ? 'var(--accent-soft)' : 'var(--bg-hover)',
              color: selectedCategoryId === null ? 'var(--accent-hover)' : 'var(--text-tertiary)',
            }}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id === selectedCategoryId ? null : cat.id)}
              className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors"
              style={{
                background: selectedCategoryId === cat.id ? 'var(--accent-soft)' : 'var(--bg-hover)',
                color: selectedCategoryId === cat.id ? 'var(--accent-hover)' : 'var(--text-tertiary)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 px-2">
        {/* 인라인 그룹 생성 */}
        {creatingGroup && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
            <span className="text-sm shrink-0">📁</span>
            <input
              ref={createRef}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => { if (e.key === 'Enter') commitCreate(); if (e.key === 'Escape') { setCreatingGroup(false); setNewGroupName(''); } }}
              className="flex-1 text-xs bg-transparent outline-none px-1 py-0.5 rounded"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
              placeholder="그룹 이름 입력..."
            />
          </div>
        )}

        {/* 📌 고정됨 섹션 */}
        {pinnedPages.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setPinnedCollapsed(!pinnedCollapsed)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium w-full text-left"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg
                width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                style={{ transform: pinnedCollapsed ? 'none' : 'rotate(90deg)', transition: 'transform 0.15s' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              📌 고정됨
            </button>
            {!pinnedCollapsed && (
              <div className="ml-2 space-y-px">
                {pinnedPages.map(p => (
                  <div
                    key={'pin-' + p.id}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
                    style={{
                      background: p.id === selectedPageId ? 'var(--accent-soft)' : 'transparent',
                      color: p.id === selectedPageId ? 'var(--accent-hover)' : 'var(--text-tertiary)',
                    }}
                    onClick={() => handleSelectAndExpand(p)}
                    onMouseEnter={(e) => { if (p.id !== selectedPageId) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { if (p.id !== selectedPageId) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="text-xs shrink-0">{p.emoji}</span>
                    {p.categoryId && categoryColorMap.has(p.categoryId) && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: categoryColorMap.get(p.categoryId) }} />
                    )}
                    <span className="text-xs truncate flex-1">{p.title}</span>
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>{p.groupEmoji}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🕐 최근 페이지 섹션 */}
        {recentPages.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setRecentCollapsed(!recentCollapsed)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium w-full text-left"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg
                width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                style={{ transform: recentCollapsed ? 'none' : 'rotate(90deg)', transition: 'transform 0.15s' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              🕐 최근 페이지
            </button>
            {!recentCollapsed && (
              <div className="ml-2 space-y-px">
                {recentPages.map(p => (
                  <div
                    key={'recent-' + p.id}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
                    style={{
                      background: p.id === selectedPageId ? 'var(--accent-soft)' : 'transparent',
                      color: p.id === selectedPageId ? 'var(--accent-hover)' : 'var(--text-tertiary)',
                    }}
                    onClick={() => handleSelectAndExpand(p)}
                    onMouseEnter={(e) => { if (p.id !== selectedPageId) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { if (p.id !== selectedPageId) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="text-xs shrink-0">{p.emoji}</span>
                    {p.categoryId && categoryColorMap.has(p.categoryId) && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: categoryColorMap.get(p.categoryId) }} />
                    )}
                    <span className="text-xs truncate flex-1">{p.title}</span>
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>{p.groupEmoji}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 구분선 */}
        {(pinnedPages.length > 0 || recentPages.length > 0) && (
          <hr className="my-2 mx-2" style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
        )}

        {/* 그룹 트리 */}
        {groups.length === 0 && !creatingGroup && (
          <p className="text-xs px-3 py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
            그룹을 만들어 노트를 정리하세요
          </p>
        )}
        {groups.map((g) => (
          <div
            key={g.id}
            className="mb-1"
            style={{ ...dropStyle(g.id, 'before'), ...dropStyle(g.id, 'after') }}
          >
            {/* 그룹 헤더 */}
            <div
              className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              draggable
              onDragStart={(e) => handleDragStartGroup(e, g.id)}
              onDragOver={(e) => handleDragOver(e, g.id, e.currentTarget.getBoundingClientRect())}
              onDragEnd={handleDragEnd}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <button onClick={() => onToggleGroup(g.id)} className="shrink-0 w-4 h-4 flex items-center justify-center">
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: g.expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <span className="text-sm shrink-0">{g.emoji}</span>

              {editingGroupId === g.id ? (
                <input
                  ref={editRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingGroupId(null); }}
                  className="flex-1 text-xs bg-transparent outline-none px-1 py-0.5 rounded"
                  style={{ color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
                />
              ) : (
                <span
                  className="flex-1 text-xs font-medium truncate"
                  onDoubleClick={() => { setEditingGroupId(g.id); setEditName(g.name); }}
                >
                  {g.name}
                </span>
              )}

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onCreatePage(g.id); }}
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="새 페이지"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`"${g.name}" 그룹과 하위 페이지를 삭제할까요?`)) onDeleteGroup(g.id); }}
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="그룹 삭제"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 페이지 목록 */}
            {g.expanded && (
              <div className="ml-4 mt-0.5 space-y-px">
                {g.pages.map((p) => {
                  const active = p.id === selectedPageId;
                  return (
                    <div
                      key={p.id}
                      className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
                      style={{
                        background: active ? 'var(--accent-soft)' : 'transparent',
                        color: active ? 'var(--accent-hover)' : 'var(--text-tertiary)',
                        ...dropStyle(p.id, 'before'),
                        ...dropStyle(p.id, 'after'),
                      }}
                      draggable
                      onDragStart={(e) => handleDragStartPage(e, p.id)}
                      onDragOver={(e) => handleDragOver(e, p.id, e.currentTarget.getBoundingClientRect())}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectPage(p)}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span className="text-xs shrink-0">{p.emoji}</span>
                      {p.categoryId && categoryColorMap.has(p.categoryId) && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: categoryColorMap.get(p.categoryId) }} />
                      )}
                      <span className="text-xs truncate flex-1">{p.title}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                        {/* 핀 토글 */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onTogglePin(p); }}
                          className="w-4 h-4 rounded flex items-center justify-center"
                          style={{ color: p.isPinned ? 'var(--accent)' : 'var(--text-tertiary)' }}
                          title={p.isPinned ? '고정 해제' : '고정'}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill={p.isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L12 12M8 6L16 6M9 12L9 16L15 16L15 12M12 16L12 22" />
                          </svg>
                        </button>
                        {/* 삭제 */}
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`"${p.title}" 페이지를 삭제할까요?`)) onDeletePage(p.id); }}
                          className="w-4 h-4 rounded flex items-center justify-center"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {g.pages.length === 0 && (
                  <p className="text-[10px] px-2 py-1" style={{ color: 'var(--text-tertiary)' }}>빈 그룹</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 카테고리 관리 버튼 */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setCategoryManagerOpen(true)}
          className="flex items-center gap-1.5 w-full px-4 py-2.5 text-[11px] font-medium transition-colors cursor-pointer"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          카테고리 관리
        </button>
      </div>

      <CategoryManager
        categories={categories}
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        onCreate={onCreateCategory}
        onRename={onRenameCategory}
        onDelete={onDeleteCategory}
      />

      {/* 하단 검색 힌트 */}
      <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          <kbd className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>⌘K</kbd>
          {' '}빠른 검색
        </span>
      </div>
    </div>
  );
}
