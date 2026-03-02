'use client';

import { useSidebar } from './SidebarContext';

export function LayoutMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main
      className="min-h-screen p-8 transition-all duration-200"
      style={{ marginLeft: collapsed ? '56px' : '240px' }}
    >
      {children}
    </main>
  );
}
