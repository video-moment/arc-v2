'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type AppMode = 'workspace' | 'monitor';

const WORKSPACE_PATHS = ['/tasks', '/notes'];

function detectMode(pathname: string): AppMode {
  return WORKSPACE_PATHS.some(p => pathname.startsWith(p)) ? 'workspace' : 'monitor';
}

interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false, toggle: () => {}, collapse: () => {}, expand: () => {},
  mode: 'monitor', setMode: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<AppMode>(() => detectMode(pathname));
  const toggle = useCallback(() => setCollapsed(prev => !prev), []);
  const collapse = useCallback(() => setCollapsed(true), []);
  const expand = useCallback(() => setCollapsed(false), []);

  // URL 변경 시 모드 자동 감지
  useEffect(() => {
    setMode(detectMode(pathname));
  }, [pathname]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, collapse, expand, mode, setMode }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
