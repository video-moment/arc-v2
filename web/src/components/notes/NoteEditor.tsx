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

      {/* 제목 바 */}
      <div className="flex items-center gap-3 px-8 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
          {/* 카테고리 선택 */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1">
              {page.categoryId && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: categories.find(c => c.id === page.categoryId)?.color ?? '#6b7280' }}
                />
              )}
              <select
                value={page.categoryId ?? ''}
                onChange={(e) => onCategoryChange(e.target.value || null)}
                className="text-[11px] bg-transparent outline-none cursor-pointer"
                style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 4px' }}
              >
                <option value="">카테고리 없음</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {saving ? '저장 중...' : lastSaved ? `저장됨 ${lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
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
            placeholder="마크다운으로 작성하세요... (# 제목, ## 소제목, - 목록, > 인용, [[페이지명]] 위키 링크)"
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
