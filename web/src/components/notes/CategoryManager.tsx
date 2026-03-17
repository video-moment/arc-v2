'use client';

import { useState, useRef, useEffect } from 'react';
import type { NoteCategory } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit3, Trash2 } from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#ef4444', '#6b7280',
];

interface CategoryManagerProps {
  categories: NoteCategory[];
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
  onRename: (id: string, name: string, color?: string) => void;
  onDelete: (id: string) => void;
}

export default function CategoryManager({
  categories,
  open,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: CategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const createRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => createRef.current?.focus(), 100);
    } else {
      setNewName('');
      setNewColor('#6366f1');
      setEditingId(null);
    }
  }, [open]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const commitCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim(), newColor);
    }
    setNewName('');
    setNewColor('#6366f1');
    setTimeout(() => createRef.current?.focus(), 50);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim(), editColor || undefined);
    }
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-base font-semibold">카테고리 관리</DialogTitle>
        </DialogHeader>

        {/* New category form */}
        <div className="px-6 py-4 border-b">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">새 카테고리</label>

          {/* Color presets */}
          <div className="flex items-center gap-2 mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-6 h-6 rounded-full transition-transform cursor-pointer shrink-0"
                style={{
                  background: c,
                  transform: newColor === c ? 'scale(1.2)' : 'scale(1)',
                  outline: newColor === c ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: newColor }} />
            <Input
              ref={createRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitCreate(); }}
              placeholder="카테고리 이름 입력..."
              className="flex-1 h-8 text-sm"
            />
            <Button
              size="sm"
              variant={newName.trim() ? 'default' : 'secondary'}
              onClick={commitCreate}
              className="shrink-0"
            >
              추가
            </Button>
          </div>
        </div>

        {/* Category list */}
        <ScrollArea className="max-h-[320px]">
          <div className="px-6 py-4">
            {categories.length === 0 ? (
              <p className="text-sm text-center py-6 text-muted-foreground">
                아직 카테고리가 없습니다
              </p>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    {/* Color indicator or color picker in edit mode */}
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className="w-4 h-4 rounded-full transition-all cursor-pointer"
                            style={{
                              background: c,
                              outline: editColor === c ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                              outlineOffset: '1px',
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                    )}

                    {/* Name */}
                    {editingId === cat.id ? (
                      <Input
                        ref={editRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 h-7 text-sm"
                      />
                    ) : (
                      <span className="flex-1 text-sm text-foreground">
                        {cat.name}
                      </span>
                    )}

                    {/* Action buttons */}
                    {editingId !== cat.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); }}
                          title="이름 변경"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 hover:text-destructive"
                          onClick={() => {
                            if (confirm(`"${cat.name}" 카테고리를 삭제할까요?`)) {
                              onDelete(cat.id);
                            }
                          }}
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
