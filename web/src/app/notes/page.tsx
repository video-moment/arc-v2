'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getNoteGroups,
  createNoteGroup,
  updateNoteGroup,
  deleteNoteGroup,
  getNotePages,
  createNotePage,
  updateNotePage,
  deleteNotePage,
  type NoteGroup,
  type NotePage,
} from '@/lib/api';
import SidePanel from '@/components/notes/SidePanel';
import NoteEditor from '@/components/notes/NoteEditor';
import EmptyState from '@/components/notes/EmptyState';
import QuickSwitcher from '@/components/notes/QuickSwitcher';

interface GroupWithPages extends NoteGroup {
  pages: NotePage[];
  expanded: boolean;
}

export default function NotesPage() {
  const [groups, setGroups] = useState<GroupWithPages[]>([]);
  const [selectedPage, setSelectedPage] = useState<NotePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

  // ── Data loading ──
  const loadData = useCallback(async () => {
    setLoadError(false);
    try {
      const [gs, ps] = await Promise.all([getNoteGroups(), getNotePages()]);
      const grouped: GroupWithPages[] = gs.map((g) => ({
        ...g,
        pages: ps.filter((p) => p.groupId === g.id),
        expanded: true,
      }));
      setGroups((prev) => {
        const expandedMap = new Map(prev.map((g) => [g.id, g.expanded]));
        return grouped.map((g) => ({ ...g, expanded: expandedMap.get(g.id) ?? true }));
      });
    } catch (e) {
      console.error('노트 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => { if (loading) setLoadError(true); }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // ── Cmd+K global shortcut ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSwitcherOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Group CRUD ──
  const handleCreateGroup = async (name: string) => {
    await createNoteGroup(name);
    loadData();
  };

  const handleRenameGroup = async (id: string, name: string) => {
    await updateNoteGroup(id, { name });
    loadData();
  };

  const handleDeleteGroup = async (id: string) => {
    await deleteNoteGroup(id);
    if (selectedPage && groups.find((g) => g.id === id)?.pages.some((p) => p.id === selectedPage.id)) {
      setSelectedPage(null);
    }
    loadData();
  };

  const handleToggleGroup = (id: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, expanded: !g.expanded } : g)));
  };

  // ── Page CRUD ──
  const handleCreatePage = async (groupId: string) => {
    const page = await createNotePage(groupId, '새 페이지');
    await loadData();
    setSelectedPage(page);
  };

  const handleDeletePage = async (id: string) => {
    await deleteNotePage(id);
    if (selectedPage?.id === id) setSelectedPage(null);
    loadData();
  };

  const handleSaveContent = useCallback(async (content: string) => {
    if (!selectedPage) return;
    await updateNotePage(selectedPage.id, { content });
  }, [selectedPage]);

  const handleTitleChange = useCallback(async (title: string) => {
    if (!selectedPage) return;
    await updateNotePage(selectedPage.id, { title });
    setSelectedPage((prev) => prev ? { ...prev, title } : null);
    loadData();
  }, [selectedPage, loadData]);

  const handleSelectPage = (page: NotePage) => {
    setSelectedPage(page);
  };

  // ── Pin toggle ──
  const handleTogglePin = async (page: NotePage) => {
    await updateNotePage(page.id, { isPinned: !page.isPinned });
    loadData();
  };

  // ── Reorder ──
  const handleReorderGroups = async (groupId: string, newSortOrder: number) => {
    await updateNoteGroup(groupId, { sortOrder: newSortOrder });
    loadData();
  };

  const handleReorderPages = async (pageId: string, newSortOrder: number) => {
    await updateNotePage(pageId, { sortOrder: newSortOrder });
    loadData();
  };

  // ── Wiki link navigation ──
  const handleNavigateToPage = (pageId: string) => {
    for (const g of groups) {
      const page = g.pages.find(p => p.id === pageId);
      if (page) {
        setSelectedPage(page);
        if (!g.expanded) {
          setGroups(prev => prev.map(gr => gr.id === g.id ? { ...gr, expanded: true } : gr));
        }
        return;
      }
    }
  };

  // All pages flat list for wiki link resolution
  const allPages = useMemo(() => {
    return groups.flatMap(g => g.pages.map(p => ({ id: p.id, title: p.title })));
  }, [groups]);

  // Find group info for selected page
  const selectedGroup = selectedPage
    ? groups.find(g => g.pages.some(p => p.id === selectedPage.id))
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: 'var(--text-tertiary)' }}>
        <div className="flex flex-col items-center gap-3">
          {loadError ? (
            <>
              <span className="text-sm" style={{ color: 'var(--red)' }}>연결에 실패했습니다. 새로고침해주세요</span>
              <button
                onClick={() => { setLoading(true); setLoadError(false); loadData(); }}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                다시 시도
              </button>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              <span className="text-sm">노트를 불러오는 중...</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex -m-8" style={{ background: 'var(--bg-primary)', height: 'calc(100vh)' }}>
      <SidePanel
        groups={groups}
        selectedPageId={selectedPage?.id ?? null}
        onSelectPage={handleSelectPage}
        onCreateGroup={handleCreateGroup}
        onCreatePage={handleCreatePage}
        onDeleteGroup={handleDeleteGroup}
        onDeletePage={handleDeletePage}
        onToggleGroup={handleToggleGroup}
        onRenameGroup={handleRenameGroup}
        onTogglePin={handleTogglePin}
        onReorderGroups={handleReorderGroups}
        onReorderPages={handleReorderPages}
      />
      <div className="flex-1 min-w-0">
        {selectedPage ? (
          <NoteEditor
            key={selectedPage.id}
            page={selectedPage}
            groupName={selectedGroup?.name ?? ''}
            groupEmoji={selectedGroup?.emoji ?? '📁'}
            allPages={allPages}
            onSave={handleSaveContent}
            onTitleChange={handleTitleChange}
            onNavigateToPage={handleNavigateToPage}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      <QuickSwitcher
        open={quickSwitcherOpen}
        groups={groups}
        onClose={() => setQuickSwitcherOpen(false)}
        onSelectPage={handleSelectPage}
      />
    </div>
  );
}
