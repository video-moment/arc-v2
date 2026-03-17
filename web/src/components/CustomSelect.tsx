'use client';

import { useState, useRef, useEffect } from 'react';

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
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '100%',
    background: 'var(--bg-elevated)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)',
    zIndex: 50,
    overflow: 'hidden',
    opacity: open ? 1 : 0,
    transform: open ? 'translateY(0)' : 'translateY(-4px)',
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        type="button"
        style={triggerStyle}
        onClick={() => {
          if (!disabled) setOpen(o => !o);
        }}
        disabled={disabled}
      >
        {/* Color dot */}
        {selected?.color && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: selected.color,
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ flex: 1 }}>{selected ? selected.label : placeholder}</span>
        <span
          style={{
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={isSm ? 10 : 12} />
        </span>
      </button>

      {/* Dropdown */}
      <div style={dropdownStyle}>
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: isSm ? '6px 10px' : '8px 12px',
                fontSize: isSm ? '11px' : '13px',
                textAlign: 'left',
                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              {/* Color dot */}
              {option.color && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: option.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ flex: 1 }}>{option.label}</span>
              {isSelected && (
                <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                  <CheckMark size={isSm ? 10 : 12} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
