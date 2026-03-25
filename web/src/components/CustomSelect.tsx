'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

function ChevronDown({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function CustomSelect({
  value,
  options,
  onChange,
  placeholder = '선택...',
  size = 'md',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = options.length * 36 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < dropdownHeight ? rect.top - dropdownHeight - 4 : rect.bottom + 4;
    setPos({ top, left: rect.left, minWidth: rect.width });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const isSm = size === 'sm';

  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: isSm ? '4px' : '6px',
    padding: isSm ? '3px 7px' : '5px 10px',
    borderRadius: '6px',
    fontSize: isSm ? '11px' : '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: 'var(--bg-input, var(--bg-secondary))',
    color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)',
    border: '1px solid var(--border)',
    outline: 'none',
    userSelect: 'none',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color 0.15s ease',
    whiteSpace: 'nowrap',
  };

  const dropdown = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: pos.top + 'px',
        left: pos.left + 'px',
        minWidth: pos.minWidth + 'px',
        background: 'var(--bg-elevated)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        zIndex: 9999,
        overflow: 'hidden',
        animation: 'fadeInUp 0.15s ease',
        padding: '4px 0',
      }}
    >
      {options.map(option => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: isSm ? '6px 10px' : '8px 12px',
              fontSize: isSm ? '11px' : '13px', textAlign: 'left',
              background: isSelected ? 'var(--accent-soft)' : 'transparent',
              color: isSelected ? 'var(--color-accent)' : 'var(--text-primary)',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={e => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={e => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {option.color && (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: option.color, flexShrink: 0 }} />
            )}
            <span style={{ flex: 1 }}>{option.label}</span>
            {isSelected && (
              <span style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center' }}>
                <CheckMark size={isSm ? 10 : 12} />
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        style={triggerStyle}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        disabled={disabled}
      >
        {selected?.color && (
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selected.color, flexShrink: 0 }} />
        )}
        <span style={{ flex: 1 }}>{selected ? selected.label : placeholder}</span>
        <span
          style={{
            color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center',
            transition: 'transform 0.15s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={isSm ? 10 : 12} />
        </span>
      </button>
      {dropdown}
    </div>
  );
}
