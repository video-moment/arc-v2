'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';

const NAV = [
  { href: '/', label: '에이전트', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"/>
    </svg>
  )},
  { href: '/monitor', label: '프롬프트', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="9" height="9" rx="1"/><rect x="13" y="3" width="9" height="9" rx="1"/><rect x="2" y="14" width="9" height="9" rx="1"/><rect x="13" y="14" width="9" height="9" rx="1"/>
    </svg>
  )},
  { href: '/squads', label: '스쿼드', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { href: '/pomodoro', label: '뽀모도로', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50 transition-all duration-200"
      style={{
        width: collapsed ? '56px' : '240px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo + Toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-6'} py-6`}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
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
        )}
        <button
          onClick={toggle}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <path d="M9 18l6-6-6-6"/>
            ) : (
              <path d="M15 18l-6-6 6-6"/>
            )}
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            메뉴
          </p>
        )}
        <div className="space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150`}
                style={{
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
                }}
                title={collapsed ? label : undefined}
              >
                <span style={{ opacity: active ? 1 : 0.6 }}>{icon}</span>
                {!collapsed && label}
                {!collapsed && active && (
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
      <div className={`${collapsed ? 'px-2 justify-center' : 'px-6'} py-4 flex`} style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse-dot shrink-0" style={{ background: 'var(--green)' }} />
          {!collapsed && (
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              백엔드 연결됨
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
