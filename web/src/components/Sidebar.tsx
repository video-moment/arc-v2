'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: '에이전트', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"/>
    </svg>
  )},
  { href: '/squads', label: '스쿼드', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { href: '/tasks', label: '태스크', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/>
    </svg>
  )},
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-50"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'var(--gradient-accent)' }}
          >
            A
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              ARC V2
            </span>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>
              에이전트 대시보드
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          메뉴
        </p>
        <div className="space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                style={{
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.6 }}>{icon}</span>
                {label}
                {active && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--green)' }} />
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            백엔드 연결됨
          </span>
        </div>
      </div>
    </aside>
  );
}
