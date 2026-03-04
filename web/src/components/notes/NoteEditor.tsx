'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { NoteCategory, NotePage } from '@/lib/api';
import Breadcrumb from './Breadcrumb';
import PageMetaFooter from './PageMetaFooter';

interface NoteEditorProps {
  page: NotePage;
  groupName: string;
  groupEmoji: string;
  allPages: { id: string; title: string }[];
  categories: NoteCategory[];
  onSave: (content: string) => void;
  onTitleChange: (title: string) => void;
  onNavigateToPage: (pageId: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
}

export default function NoteEditor({
  page,
  groupName,
  groupEmoji,
  allPages,
  categories,
  onSave,
  onTitleChange,
  onNavigateToPage,
  onCategoryChange,
}: NoteEditorProps) {
  const [content, setContent] = useState(page.content);
  const [title, setTitle] = useState(page.title);
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(page.content);
    setTitle(page.title);
    setLastSaved(null);
    setMode(page.content ? 'preview' : 'edit');
  }, [page.id, page.content, page.title]);

  useEffect(() => {
    if (mode === 'edit') textareaRef.current?.focus();
  }, [mode]);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Wiki link preprocessing: [[page name]] → clickable link
  const processWikiLinks = (text: string): string => {
    return text.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
      const found = allPages.find(p => p.title === name.trim());
      if (found) {
        return `[${name}](wiki://${found.id})`;
      }
      return `~~${name}~~`;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 브레드크럼 */}
      <div className="px-8 pt-3">
        <Breadcrumb
          groupEmoji={groupEmoji}
          groupName={groupName}
          pageEmoji={page.emoji}
          pageTitle={page.title}
        />
      </div>

      {/* 제목 + 메타 바 */}
      <div className="px-10 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {/* 제목 행 */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{page.emoji}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="flex-1 text-2xl font-bold bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="제목 없음"
          />
        </div>
        {/* 메타 행: 카테고리 + 저장 상태 + 편집/미리보기 */}
        <div className="flex items-center gap-3">
          {/* 카테고리 커스텀 드롭다운 */}
          {categories.length > 0 && (
            <div className="relative" ref={catRef}>
              <button
                onClick={() => setCatOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all"
                style={{
                  background: page.categoryId ? 'var(--accent-soft)' : 'var(--bg-hover)',
                  color: page.categoryId ? 'var(--accent-hover)' : 'var(--text-tertiary)',
                  border: `1px solid ${catOpen ? 'var(--accent)' : 'var(--border-subtle)'}`,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: page.categoryId ? (categories.find(c => c.id === page.categoryId)?.color ?? '#6b7280') : 'var(--text-tertiary)' }}
                />
                {page.categoryId ? categories.find(c => c.id === page.categoryId)?.name : '카테고리'}
                <svg className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-tertiary)', transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5l3 3 3-3" />
                </svg>
              </button>
              {catOpen && (
                <div
                  className="absolute top-full left-0 mt-1.5 min-w-[160px] rounded-xl py-1.5 z-50"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  <button
                    onClick={() => { onCategoryChange(null); setCatOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm transition-colors"
                    style={{
                      color: !page.categoryId ? 'var(--accent-hover)' : 'var(--text-secondary)',
                      background: !page.categoryId ? 'var(--accent-soft)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (page.categoryId) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { if (page.categoryId) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: 'var(--text-tertiary)' }} />
                    없음
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { onCategoryChange(cat.id); setCatOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm transition-colors"
                      style={{
                        color: page.categoryId === cat.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
                        background: page.categoryId === cat.id ? 'var(--accent-soft)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (page.categoryId !== cat.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { if (page.categoryId !== cat.id) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {saving ? '저장 중...' : lastSaved ? `저장됨 ${lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <div className="flex-1" />
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setMode('edit')}
              className="px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: mode === 'edit' ? 'var(--accent-soft)' : 'transparent',
                color: mode === 'edit' ? 'var(--accent-hover)' : 'var(--text-tertiary)',
              }}
            >
              편집
            </button>
            <button
              onClick={() => setMode('preview')}
              className="px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
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
            className="w-full h-full resize-none bg-transparent outline-none px-10 py-8 text-[15px] leading-[1.8] font-mono"
            style={{ color: 'var(--text-primary)', minHeight: '100%' }}
            placeholder="마크다운으로 작성하세요... (# 제목, ## 소제목, - 목록, > 인용, [[페이지명]] 위키 링크)"
          />
        ) : (
          <div
            className="note-markdown px-10 py-8 cursor-text min-h-full"
            onClick={() => setMode('edit')}
          >
            {content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.75rem', lineHeight: 1.3 }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1.5rem 0 0.5rem', lineHeight: 1.3 }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1.25rem 0 0.4rem', lineHeight: 1.4 }}>{children}</h3>,
                  p: ({ children }) => <p style={{ fontSize: '0.938rem', color: 'var(--text-primary)', margin: '0 0 0.85rem', lineHeight: 1.8 }}>{children}</p>,
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
                  a: ({ href, children }) => {
                    // Wiki link interception
                    if (href?.startsWith('wiki://')) {
                      const pageId = href.replace('wiki://', '');
                      return (
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigateToPage(pageId); }}
                          style={{ color: 'var(--accent-hover)', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {children}
                        </a>
                      );
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-hover)', textDecoration: 'underline' }}>{children}</a>;
                  },
                  del: ({ children }) => <del style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>{children}</del>,
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
                    <input type="checkbox" checked={checked} readOnly style={{ marginRight: 6, accentColor: 'var(--accent)' }} {...props} />
                  ),
                }}
              >
                {processWikiLinks(content)}
              </ReactMarkdown>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                클릭하여 작성 시작... (마크다운 지원)
              </p>
            )}
          </div>
        )}
      </div>

      {/* 메타 푸터 */}
      <PageMetaFooter content={content} updatedAt={page.updatedAt} />
    </div>
  );
}
