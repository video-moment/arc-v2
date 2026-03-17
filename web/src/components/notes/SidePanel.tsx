'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { NoteCategory, NotePage } from '@/lib/api';
import CategoryManager from './CategoryManager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import NoteIcon, { ICON_MAP, ICON_NAMES } from './NoteIcon';
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Pin,
  Trash2,
  Settings,
  Search,
  FileText,
  ArrowLeft,
  FolderInput,
} from 'lucide-react';

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
  onChangeGroupEmoji: (id: string, emoji: string) => void;
  onChangePageEmoji: (id: string, emoji: string) => void;
  onMovePage: (pageId: string, targetGroupId: string) => void;
  categories: NoteCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory: (name: string, color: string) => void;
  onRenameCategory: (id: string, name: string, color?: string) => void;
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
  onChangeGroupEmoji,
  onChangePageEmoji,
  onMovePage,
  onRenameCategory,
  onDeleteCategory,
}: SidePanelProps) {
  const router = useRouter();
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'group' | 'page'; id: string; name: string } | null>(null);

  // Icon picker uses ICON_NAMES from NoteIcon

  // Move page
  const [movePageId, setMovePageId] = useState<string | null>(null);

  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.id, c.color));
    return map;
  }, [categories]);

  // Drag state
  const [dragType, setDragType] = useState<'group' | 'page' | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  useEffect(() => { if (editingGroupId) editRef.current?.focus(); }, [editingGroupId]);
  useEffect(() => { if (creatingGroup) createRef.current?.focus(); }, [creatingGroup]);

  // Cmd+K → focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const commitRename = () => {
    if (editingGroupId && editName.trim()) onRenameGroup(editingGroupId, editName.trim());
    setEditingGroupId(null);
  };

  const commitCreate = () => {
    if (newGroupName.trim()) onCreateGroup(newGroupName.trim());
    setCreatingGroup(false);
    setNewGroupName('');
  };

  // Pinned pages
  const pinnedPages = useMemo(() => {
    return groups.flatMap(g =>
      g.pages.filter(p => p.isPinned).map(p => ({ ...p, groupName: g.name, groupEmoji: g.emoji, groupId: g.id }))
    );
  }, [groups]);

  // Search filter
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return groups.flatMap(g =>
      g.pages
        .filter(p => p.title.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q))
        .map(p => ({ ...p, groupName: g.name, groupEmoji: g.emoji }))
    );
  }, [groups, searchQuery]);

  const handleSelectAndExpand = (page: NotePage) => {
    onSelectPage(page);
    const parentGroup = groups.find(g => g.id === page.groupId);
    if (parentGroup && !parentGroup.expanded) onToggleGroup(parentGroup.id);
  };

  // Drag handlers
  const handleDragStartGroup = (e: React.DragEvent, groupId: string) => {
    setDragType('group'); setDragId(groupId); e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragStartPage = (e: React.DragEvent, pageId: string) => {
    setDragType('page'); setDragId(pageId); e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, targetId: string, rect?: DOMRect) => {
    e.preventDefault();
    if (!rect) return;
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
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
    setDragType(null); setDragId(null); setDropTarget(null);
  };

  const dropStyle = (id: string): React.CSSProperties => {
    if (!dropTarget || dropTarget.id !== id) return {};
    return dropTarget.position === 'before'
      ? { borderTop: '2px solid hsl(var(--primary))' }
      : { borderBottom: '2px solid hsl(var(--primary))' };
  };

  const renderPageItem = (
    p: NotePage & { isPinned?: boolean; groupEmoji?: string },
    keyPrefix: string,
    options?: { showGroupEmoji?: boolean; showActions?: boolean }
  ) => {
    const active = p.id === selectedPageId;
    const { showGroupEmoji = false, showActions = false } = options || {};

    return (
      <div
        key={keyPrefix + p.id}
        className={cn(
          'group/page relative flex items-center gap-2 px-2.5 py-[7px] rounded-lg cursor-pointer transition-all',
          active
            ? 'bg-primary/8 text-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        )}
        onClick={() =>
          keyPrefix === 'pin-' ? handleSelectAndExpand(p) : onSelectPage(p)
        }
        draggable={!showGroupEmoji}
        onDragStart={!showGroupEmoji ? (e) => handleDragStartPage(e, p.id) : undefined}
        onDragOver={!showGroupEmoji ? (e) => handleDragOver(e, p.id, e.currentTarget.getBoundingClientRect()) : undefined}
        onDragEnd={!showGroupEmoji ? handleDragEnd : undefined}
        style={!showGroupEmoji ? dropStyle(p.id) : undefined}
      >
        {showActions ? (
          <Popover>
            <PopoverTrigger
              className="shrink-0 opacity-70 hover:opacity-100 hover:scale-110 transition-all cursor-pointer text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <NoteIcon name={p.emoji} size={14} />
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-2" align="start" side="bottom">
              <p className="text-[11px] text-muted-foreground/50 mb-1.5 px-1">페이지 아이콘 변경</p>
              <div className="grid grid-cols-8 gap-0.5">
                {ICON_NAMES.map(name => {
                  const Icon = ICON_MAP[name];
                  return (
                    <button
                      key={name}
                      className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors',
                        p.emoji === name && 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      )}
                      onClick={() => onChangePageEmoji(p.id, name)}
                      title={name}
                    >
                      <Icon size={14} strokeWidth={1.8} />
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <NoteIcon name={p.emoji} size={14} className="opacity-70" />
        )}
        {p.categoryId && categoryColorMap.has(p.categoryId) && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: categoryColorMap.get(p.categoryId) }} />
        )}
        <span className="text-[13px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap leading-snug">
          {p.title}
        </span>
        {showGroupEmoji && (p as any).groupEmoji && (
          <NoteIcon name={(p as any).groupEmoji} size={11} className="opacity-40" />
        )}
        {showActions && (
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/page:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(p); }}
              className={cn(
                'w-5 h-5 rounded-md flex items-center justify-center transition-colors',
                p.isPinned ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
              )}
            >
              <Pin className="w-2.5 h-2.5" fill={p.isPinned ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMovePageId(movePageId === p.id ? null : p.id); }}
              className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title="다른 그룹으로 이동"
            >
              <FolderInput className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ type: 'page', id: p.id, name: p.title });
              }}
              className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
        {/* Move page dropdown */}
        {showActions && movePageId === p.id && (
          <div
            className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded-lg shadow-lg p-1 min-w-[140px] max-h-[200px] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] text-muted-foreground/50 px-2 py-1">이동할 그룹</p>
            {groups.filter(g => g.id !== p.groupId).map(g => (
              <button
                key={g.id}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[12px] text-muted-foreground hover:bg-accent transition-colors"
                onClick={() => { onMovePage(p.id, g.id); setMovePageId(null); }}
              >
                <NoteIcon name={g.emoji} size={14} />
                <span className="truncate">{g.name}</span>
              </button>
            ))}
            {groups.filter(g => g.id !== p.groupId).length === 0 && (
              <p className="text-[11px] text-muted-foreground/40 px-2 py-1">다른 그룹이 없습니다</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[260px] flex flex-col h-screen border-r bg-muted/20 select-none">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={() => router.push('/pomodoro')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
          title="워크스페이스로 돌아가기"
          aria-label="워크스페이스로 돌아가기"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-semibold text-foreground tracking-tight flex-1">노트</span>
        <button
          onClick={() => setCreatingGroup(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
          title="새 그룹"
          aria-label="새 그룹"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-accent/50 border border-transparent focus-within:border-primary/30 transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색..."
            className="flex-1 text-[12px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40"
          />
          {!searchQuery && (
            <kbd className="text-[9px] text-muted-foreground/30 px-1 py-0.5 rounded border border-muted-foreground/10 leading-none">
              ⌘K
            </kbd>
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-muted-foreground/40 hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && !searchQuery && (
        <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto scrollbar-none shrink-0">
          <button
            className={cn(
              'flex-shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors',
              selectedCategoryId === null
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/60'
            )}
            onClick={() => onSelectCategory(null)}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors',
                selectedCategoryId === cat.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/60'
              )}
              onClick={() => onSelectCategory(cat.id === selectedCategoryId ? null : cat.id)}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {/* Search results */}
          {searchFiltered && (
            <div className="mb-2">
              <p className="px-2.5 py-1 text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">
                {searchFiltered.length}개 결과
              </p>
              {searchFiltered.map(p => renderPageItem(p, 'search-', { showGroupEmoji: true }))}
              {searchFiltered.length === 0 && (
                <p className="text-[11px] text-muted-foreground/40 text-center py-6">결과 없음</p>
              )}
            </div>
          )}

          {/* Normal view */}
          {!searchFiltered && (
            <>
              {/* Create group inline */}
              {creatingGroup && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 mb-1">
                  <NoteIcon name="folder" size={14} className="text-muted-foreground/50" />
                  <input
                    ref={createRef}
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onBlur={commitCreate}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitCreate();
                      if (e.key === 'Escape') { setCreatingGroup(false); setNewGroupName(''); }
                    }}
                    className="flex-1 text-[12px] bg-transparent outline-none border border-primary/40 rounded-md px-2 py-1 text-foreground"
                    placeholder="그룹 이름..."
                  />
                </div>
              )}

              {/* Pinned */}
              {pinnedPages.length > 0 && (
                <div className="mb-1">
                  <p className="px-2.5 py-1 text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">
                    고정됨
                  </p>
                  {pinnedPages.map(p => renderPageItem(p, 'pin-', { showGroupEmoji: true }))}
                </div>
              )}

              {/* Groups */}
              {groups.length === 0 && !creatingGroup && (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground/40">
                  <FileText className="w-8 h-8 opacity-40" />
                  <p className="text-[12px]">그룹을 만들어 시작하세요</p>
                </div>
              )}

              {groups.map((g) => (
                <div key={g.id} className="mb-0.5" style={dropStyle(g.id)}>
                  {/* Group header */}
                  <div
                    className="group/grp flex items-center gap-1 px-2 py-[6px] rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    draggable
                    onDragStart={(e) => handleDragStartGroup(e, g.id)}
                    onDragOver={(e) => handleDragOver(e, g.id, e.currentTarget.getBoundingClientRect())}
                    onDragEnd={handleDragEnd}
                  >
                    <button
                      className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground/40"
                      onClick={() => onToggleGroup(g.id)}
                    >
                      <ChevronRight
                        className="w-3 h-3 transition-transform"
                        style={{ transform: g.expanded ? 'rotate(90deg)' : 'none' }}
                      />
                    </button>
                    <Popover>
                      <PopoverTrigger
                        className="shrink-0 hover:scale-110 transition-transform cursor-pointer text-muted-foreground/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <NoteIcon name={g.emoji} size={15} />
                      </PopoverTrigger>
                      <PopoverContent className="w-[240px] p-2" align="start" side="bottom">
                        <p className="text-[11px] text-muted-foreground/50 mb-1.5 px-1">그룹 아이콘 변경</p>
                        <div className="grid grid-cols-8 gap-0.5">
                          {ICON_NAMES.map(name => {
                            const Icon = ICON_MAP[name];
                            return (
                              <button
                                key={name}
                                className={cn(
                                  'w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors',
                                  g.emoji === name && 'bg-primary/10 text-primary ring-1 ring-primary/30'
                                )}
                                onClick={() => onChangeGroupEmoji(g.id, name)}
                                title={name}
                              >
                                <Icon size={14} strokeWidth={1.8} />
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {editingGroupId === g.id ? (
                      <input
                        ref={editRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditingGroupId(null);
                        }}
                        className="flex-1 text-[12px] bg-transparent outline-none border border-primary/40 rounded-md px-1.5 py-0.5 text-foreground"
                      />
                    ) : (
                      <span
                        className="flex-1 text-[13px] font-medium text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                        onDoubleClick={() => { setEditingGroupId(g.id); setEditName(g.name); }}
                      >
                        {g.name}
                      </span>
                    )}

                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/grp:opacity-100 transition-opacity">
                      <button
                        className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors"
                        onClick={(e) => { e.stopPropagation(); onCreatePage(g.id); }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'group', id: g.id, name: g.name });
                        }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pages */}
                  {g.expanded && (
                    <div className="pl-5 mt-0.5">
                      {g.pages.map(p => renderPageItem(p, '', { showActions: true }))}
                      {g.pages.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/30 px-2.5 py-1">빈 그룹</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-2 py-1.5 shrink-0">
        <button
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground/40 hover:bg-accent/50 hover:text-muted-foreground transition-colors"
          onClick={() => setCategoryManagerOpen(true)}
        >
          <Settings className="w-3 h-3" />
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              {deleteTarget?.type === 'group' ? '그룹 삭제' : '페이지 삭제'}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              <span className="font-medium text-foreground">&ldquo;{deleteTarget?.name}&rdquo;</span>
              {deleteTarget?.type === 'group'
                ? '을(를) 삭제하면 그룹 내 모든 페이지가 함께 삭제됩니다.'
                : '을(를) 삭제하시겠습니까?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTarget) {
                  if (deleteTarget.type === 'group') onDeleteGroup(deleteTarget.id);
                  else onDeletePage(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
