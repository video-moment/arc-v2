'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import type { NoteCategory, NotePage } from '@/lib/api';
import PageMetaFooter from './PageMetaFooter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  ChevronRight, Bold, Italic, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Code, Minus, Undo2, Redo2, CheckSquare,
  PanelLeftClose, PanelLeftOpen, ChevronLeft,
} from 'lucide-react';
import NoteIcon from './NoteIcon';

interface NoteEditorProps {
  page: NotePage;
  groupName: string;
  groupEmoji: string;
  allPages: { id: string; title: string }[];
  categories: NoteCategory[];
  onSave: (content: string) => void | Promise<void>;
  onTitleChange: (title: string) => void;
  onNavigateToPage: (pageId: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onGoBack?: () => void;
  sidePanelHidden?: boolean;
  onToggleSidePanel?: () => void;
}

export default function NoteEditor({
  page, groupName, groupEmoji, allPages, categories,
  onSave, onTitleChange, onNavigateToPage, onCategoryChange,
  onGoBack, sidePanelHidden, onToggleSidePanel,
}: NoteEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: '내용을 작성하세요...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: page.content,
    editorProps: {
      attributes: {
        class: 'tiptap-editor outline-none',
        style: 'min-height: calc(100vh - 280px)',
      },
    },
    onUpdate: ({ editor }) => {
      const md = (editor.storage as any).markdown.getMarkdown();
      scheduleAutoSave(md);
    },
  });

  useEffect(() => {
    if (editor && page.content !== undefined) {
      const currentMd = (editor.storage as any).markdown?.getMarkdown() ?? '';
      if (currentMd !== page.content) editor.commands.setContent(page.content || '');
      setTitle(page.title);
      setLastSaved(null);
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [page.id, page.content, page.title]);

  const scheduleAutoSave = useCallback((newContent: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try { await onSave(newContent); setLastSaved(new Date()); }
      catch (e) { console.error('자동저장 실패:', e); }
      finally { setSaving(false); }
    }, 1500);
  }, [onSave]);

  const handleTitleBlur = () => {
    if (title.trim() && title !== page.title) onTitleChange(title.trim());
  };

  const currentCategory = categories.find(c => c.id === page.categoryId);
  const currentContent = (editor?.storage as any)?.markdown?.getMarkdown() ?? page.content ?? '';

  // Btn and ToolbarDivider are defined outside the component (below)

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-2.5 shrink-0 border-b">
        <div className="flex items-center gap-1.5">
          {onToggleSidePanel && (
            <button
              onClick={onToggleSidePanel}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-colors"
            >
              {sidePanelHidden ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          )}
          <span
            className={cn('flex items-center gap-1 text-[11px] text-muted-foreground/50', onGoBack && 'cursor-pointer hover:text-foreground transition-colors')}
            onClick={onGoBack}
          >
            <NoteIcon name={groupEmoji} size={12} className="inline" /> {groupName}
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/20" />
          <span className="text-[11px] text-muted-foreground/70 truncate max-w-[180px] flex items-center gap-1"><NoteIcon name={page.emoji} size={12} /> {page.title}</span>
        </div>

        <span className={cn(
          'text-[10px] transition-opacity',
          saving ? 'text-primary' : 'text-muted-foreground/40',
          saving || lastSaved ? 'opacity-100' : 'opacity-0'
        )}>
          {saving ? '저장 중...' : lastSaved ? `${lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨` : ''}
        </span>
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="flex items-center gap-0.5 px-6 py-1.5 border-b shrink-0">
          <Btn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="제목 1"><Heading1 size={15} /></Btn>
          <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="제목 2"><Heading2 size={15} /></Btn>
          <Btn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="제목 3"><Heading3 size={15} /></Btn>
          <Div />
          <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게"><Bold size={15} /></Btn>
          <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임"><Italic size={15} /></Btn>
          <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선"><Strikethrough size={15} /></Btn>
          <Btn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="코드"><Code size={15} /></Btn>
          <Div />
          <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="목록"><List size={15} /></Btn>
          <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호 목록"><ListOrdered size={15} /></Btn>
          <Btn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="체크리스트"><CheckSquare size={15} /></Btn>
          <Div />
          <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="인용"><Quote size={15} /></Btn>
          <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선"><Minus size={15} /></Btn>
          <Div />
          <Btn onClick={() => editor.chain().focus().undo().run()} title="실행 취소"><Undo2 size={15} /></Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} title="다시 실행"><Redo2 size={15} /></Btn>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-8 py-10">
          {/* Title */}
          <div className="flex items-start gap-2.5 mb-1">
            <NoteIcon name={page.emoji} size={22} className="mt-1 text-muted-foreground/50 select-none" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="flex-1 text-[1.6rem] font-bold bg-transparent outline-none leading-tight tracking-[-0.02em] text-foreground placeholder:text-muted-foreground/30"
              placeholder="제목 없음"
            />
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div className="ml-10 mb-8">
              <Popover open={catOpen} onOpenChange={setCatOpen}>
                <PopoverTrigger
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border',
                    page.categoryId
                      ? 'bg-primary/8 text-primary border-primary/15'
                      : 'text-muted-foreground/40 border-transparent hover:border-border'
                  )}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: currentCategory?.color ?? 'hsl(var(--muted-foreground))' }} />
                  {currentCategory?.name ?? '카테고리'}
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start">
                  <button
                    onClick={() => { onCategoryChange(null); setCatOpen(false); }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-1.5 text-[12px] rounded-md transition-colors',
                      !page.categoryId ? 'bg-primary/8 text-primary' : 'text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    없음
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { onCategoryChange(cat.id); setCatOpen(false); }}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-1.5 text-[12px] rounded-md transition-colors',
                        page.categoryId === cat.id ? 'bg-primary/8 text-primary' : 'text-muted-foreground hover:bg-accent'
                      )}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          )}

          <EditorContent editor={editor} />

          {/* Empty page guide */}
          {!page.content && !editor?.getText().trim() && (
            <div className="mt-6 rounded-xl border border-dashed border-border/60 p-5">
              <p className="text-[13px] font-medium text-muted-foreground/60 mb-3">시작하기</p>
              <div className="space-y-2">
                {[
                  { label: '자유 메모', desc: '바로 타이핑을 시작하세요' },
                  { label: '체크리스트', desc: '툴바에서 체크리스트 아이콘을 누르세요' },
                  { label: '제목 구조화', desc: 'H1, H2, H3으로 문서를 구조화하세요' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-medium text-muted-foreground/50">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground/35">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PageMetaFooter content={currentContent} updatedAt={page.updatedAt} />
    </div>
  );
}

function Btn({ active, onClick, children, title: t }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={t}
      aria-label={t}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        active ? 'bg-primary/12 text-primary' : 'text-muted-foreground/40 hover:text-foreground hover:bg-accent/60'
      )}
    >
      {children}
    </button>
  );
}

function Div() {
  return <div className="w-px h-4 bg-border/50 mx-0.5" />;
}
