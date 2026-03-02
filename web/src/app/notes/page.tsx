'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

// ─── 타입 ───────────────────────────────────────────────

interface GroupWithPages extends NoteGroup {
  pages: NotePage[];
  expanded: boolean;
}

// ─── 사이드 패널: 그룹 + 페이지 트리 ─────────────────────

function SidePanel({
  groups,
  selectedPageId,
  onSelectPage,
  onCreateGroup,
  onCreatePage,
  onDeleteGroup,
  onDeletePage,
  onToggleGroup,
  onRenameGroup,
}: {
  groups: GroupWithPages[];
  selectedPageId: string | null;
  onSelectPage: (page: NotePage) => void;
  onCreateGroup: () => void;
  onCreatePage: (groupId: string) => void;
  onDeleteGroup: (id: string) => void;
  onDeletePage: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onRenameGroup: (id: string, name: string) => void;
}) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingGroupId) editRef.current?.focus();
  }, [editingGroupId]);

  const commitRename = () => {
    if (editingGroupId && editName.trim()) {
      onRenameGroup(editingGroupId, editName.trim());
    }
    setEditingGroupId(null);
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
          onClick={onCreateGroup}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          title="새 그룹"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 그룹 트리 */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {groups.length === 0 && (
          <p className="text-xs px-3 py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
            그룹을 만들어 노트를 정리하세요
          </p>
        )}
        {groups.map((g) => (
          <div key={g.id} className="mb-1">
            {/* 그룹 헤더 */}
            <div
              className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* 토글 */}
              <button onClick={() => onToggleGroup(g.id)} className="shrink-0 w-4 h-4 flex items-center justify-center">
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: g.expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* 이모지 */}
              <span className="text-sm shrink-0">{g.emoji}</span>

              {/* 그룹 이름 (편집/표시) */}
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

              {/* 액션 버튼 */}
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
                      }}
                      onClick={() => onSelectPage(p)}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span className="text-xs shrink-0">{p.emoji}</span>
                      <span className="text-xs truncate flex-1">{p.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm(`"${p.title}" 페이지를 삭제할까요?`)) onDeletePage(p.id); }}
                        className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded flex items-center justify-center shrink-0 transition-opacity"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
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
    </div>
  );
}

// ─── 에디터 ─────────────────────────────────────────────

function NoteEditor({
  page,
  onSave,
  onTitleChange,
}: {
  page: NotePage;
  onSave: (content: string) => void;
  onTitleChange: (title: string) => void;
}) {
  const [content, setContent] = useState(page.content);
  const [title, setTitle] = useState(page.title);
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 페이지가 바뀌면 리셋
  useEffect(() => {
    setContent(page.content);
    setTitle(page.title);
    setLastSaved(null);
    setMode(page.content ? 'preview' : 'edit');
  }, [page.id, page.content, page.title]);

  // 편집 모드 진입 시 textarea 포커스
  useEffect(() => {
    if (mode === 'edit') textareaRef.current?.focus();
  }, [mode]);

  // 자동 저장 (1.5초 디바운스)
  const scheduleAutoSave = useCallback((newContent: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaving(true);
      onSave(newContent);
      setTimeout(() => {
        setSaving(false);
        setLastSaved(new Date());
      }, 300);
    }, 1500);
  }, [onSave]);

  const handleContentChange = (val: string) => {
    setContent(val);
    scheduleAutoSave(val);
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== page.title) {
      onTitleChange(title.trim());
    }
  };

  // Cmd+E / Ctrl+E 로 모드 전환
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setMode((m) => (m === 'edit' ? 'preview' : 'edit'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 제목 바 */}
      <div className="flex items-center gap-3 px-8 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-xl">{page.emoji}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="flex-1 text-lg font-semibold bg-transparent outline-none"
          style={{ color: 'var(--text-primary)' }}
          placeholder="제목 없음"
        />
        <div className="flex items-center gap-2 shrink-0">
          {/* 저장 상태 */}
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {saving ? '저장 중...' : lastSaved ? `저장됨 ${lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          {/* 모드 토글 */}
          <div
            className="flex rounded-md overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => setMode('edit')}
              className="px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
              style={{
                background: mode === 'edit' ? 'var(--accent-soft)' : 'transparent',
                color: mode === 'edit' ? 'var(--accent-hover)' : 'var(--text-tertiary)',
              }}
            >
              편집
            </button>
            <button
              onClick={() => setMode('preview')}
              className="px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
              style={{
                background: mode === 'preview' ? 'var(--accent-soft)' : 'transparent',
                color: mode === 'preview' ? 'var(--accent-hover)' : 'var(--text-tertiary)',
              }}
            >
              미리보기
            </button>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-full resize-none bg-transparent outline-none px-8 py-6 text-sm leading-relaxed font-mono"
            style={{ color: 'var(--text-primary)', minHeight: '100%' }}
            placeholder="마크다운으로 작성하세요... (# 제목, ## 소제목, - 목록, > 인용 등)"
          />
        ) : (
          <div
            className="note-markdown px-8 py-6 cursor-text min-h-full"
            onClick={() => setMode('edit')}
          >
            {content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.75rem', lineHeight: 1.3 }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1.5rem 0 0.5rem', lineHeight: 1.3 }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1.25rem 0 0.4rem', lineHeight: 1.4 }}>{children}</h3>,
                  p: ({ children }) => <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 0.75rem', lineHeight: 1.7 }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 0.75rem', paddingLeft: '1.5rem', listStyleType: 'disc', lineHeight: 1.7 }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 0.75rem', paddingLeft: '1.5rem', listStyleType: 'decimal', lineHeight: 1.7 }}>{children}</ol>,
                  li: ({ children }) => <li style={{ margin: '0.15rem 0' }}>{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '1rem', margin: '0.75rem 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    if (isBlock) {
                      return (
                        <pre style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '0.75rem 1rem', margin: '0.75rem 0', overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
                          <code style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{children}</code>
                        </pre>
                      );
                    }
                    return <code style={{ background: 'var(--bg-hover)', padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.8rem', color: 'var(--accent-hover)', fontFamily: 'monospace' }}>{children}</code>;
                  },
                  pre: ({ children }) => <>{children}</>,
                  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-hover)', textDecoration: 'underline' }}>{children}</a>,
                  strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{children}</strong>,
                  em: ({ children }) => <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{children}</em>,
                  table: ({ children }) => (
                    <div style={{ overflowX: 'auto', margin: '0.75rem 0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid var(--border)', fontWeight: 600, color: 'var(--text-primary)' }}>{children}</th>,
                  td: ({ children }) => <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{children}</td>,
                  input: ({ checked, ...props }) => (
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      style={{ marginRight: 6, accentColor: 'var(--accent)' }}
                      {...props}
                    />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                클릭하여 작성 시작... (마크다운 지원)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 빈 상태 ────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
      <div className="text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-30">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm mb-1">페이지를 선택하거나</p>
        <p className="text-sm">새 그룹을 만들어 시작하세요</p>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ────────────────────────────────────────

export default function NotesPage() {
  const [groups, setGroups] = useState<GroupWithPages[]>([]);
  const [selectedPage, setSelectedPage] = useState<NotePage | null>(null);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      const [gs, ps] = await Promise.all([getNoteGroups(), getNotePages()]);
      const grouped: GroupWithPages[] = gs.map((g) => ({
        ...g,
        pages: ps.filter((p) => p.groupId === g.id),
        expanded: true,
      }));
      setGroups((prev) => {
        // 기존 expanded 상태 유지
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

  // 그룹 CRUD
  const handleCreateGroup = async () => {
    const name = prompt('그룹 이름:');
    if (!name?.trim()) return;
    await createNoteGroup(name.trim());
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

  // 페이지 CRUD
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: 'var(--text-tertiary)' }}>
        <span className="text-sm">로딩...</span>
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
      />
      <div className="flex-1 min-w-0">
        {selectedPage ? (
          <NoteEditor
            key={selectedPage.id}
            page={selectedPage}
            onSave={handleSaveContent}
            onTitleChange={handleTitleChange}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
