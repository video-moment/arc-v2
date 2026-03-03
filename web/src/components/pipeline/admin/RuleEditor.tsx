'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DomainRule } from '@/lib/arc-types';
import { getRules, createRule, updateRule, deleteRule } from '@/lib/arc-admin-api';

const SEVERITY_STYLE: Record<string, { color: string; soft: string; label: string }> = {
  error: { color: 'var(--red)', soft: 'var(--red-soft)', label: '오류' },
  warning: { color: 'var(--yellow)', soft: 'var(--yellow-soft)', label: '경고' },
  info: { color: 'var(--blue)', soft: 'var(--blue-soft)', label: '정보' },
};

interface RuleEditorProps {
  domainId: string;
}

export function RuleEditor({ domainId }: RuleEditorProps) {
  const [rules, setRules] = useState<DomainRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState<'error' | 'warning' | 'info'>('warning');

  const refresh = useCallback(async () => {
    const data = await getRules(domainId).catch(() => []);
    setRules(data);
  }, [domainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resetForm = () => {
    setCategory('');
    setContent('');
    setSeverity('warning');
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!category.trim() || !content.trim()) return;
    const ruleData = { category: category.trim(), content: content.trim(), severity };

    if (editingId) {
      await updateRule(editingId, domainId, ruleData);
    } else {
      await createRule(domainId, ruleData);
    }
    resetForm();
    refresh();
  };

  const handleEdit = (rule: DomainRule) => {
    setEditingId(rule.id);
    setCategory(rule.category);
    setContent(rule.content);
    setSeverity(rule.severity);
    setShowForm(true);
  };

  const handleDelete = async (ruleId: string) => {
    await deleteRule(ruleId);
    refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          규칙 <span style={{ opacity: 0.6 }}>({rules.length})</span>
        </h3>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors"
          style={{
            background: showForm ? 'var(--bg-hover)' : 'var(--accent)',
            color: showForm ? 'var(--text-secondary)' : '#fff',
          }}
        >
          {showForm ? '취소' : '+ 규칙 추가'}
        </button>
      </div>

      {showForm && (
        <div className="glass p-4 mb-4 space-y-3">
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="카테고리 (예: 보안, 품질, 스타일)"
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; }}
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="규칙 내용을 입력하세요..."
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none transition-colors"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; }}
          />
          <div className="flex items-center gap-2">
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as typeof severity)}
              className="px-2 py-1.5 text-sm rounded-lg focus:outline-none transition-colors"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="error">오류</option>
              <option value="warning">경고</option>
              <option value="info">정보</option>
            </select>
            <button
              onClick={handleSubmit}
              className="text-[11px] px-4 py-1.5 rounded-md transition-colors font-medium"
              style={{ background: 'var(--green)', color: '#fff' }}
            >
              {editingId ? '수정' : '저장'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {rules.length === 0 && !showForm && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            규칙이 없습니다
          </p>
        )}
        {rules.map(rule => {
          const sev = SEVERITY_STYLE[rule.severity] || SEVERITY_STYLE.info;
          return (
            <div
              key={rule.id}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-colors group"
              style={{ background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 shrink-0"
                style={{ background: sev.soft, color: sev.color, border: '1px solid ' + sev.color + '30' }}
              >
                {sev.label}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {rule.category}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {rule.content}
                </p>
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(rule)}
                  className="text-[11px] transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-[11px] transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
