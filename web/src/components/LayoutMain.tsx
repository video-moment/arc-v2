'use client';

import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';

const FULL_WIDTH_PATHS = ['/notes'];

export function LayoutMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const isFullWidth = FULL_WIDTH_PATHS.some(p => pathname.startsWith(p));

  return (
    <main
      className="min-h-screen transition-all duration-300 bg-background"
      style={{ marginLeft: isFullWidth ? 0 : (collapsed ? '60px' : '240px') }}
    >
      {children}
    </main>
  );
}
