'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

const SidebarContext = createContext<SidebarContextType>({ collapsed: false, toggle: () => {}, collapse: () => {}, expand: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed(prev => !prev), []);
  const collapse = useCallback(() => setCollapsed(true), []);
  const expand = useCallback(() => setCollapsed(false), []);
  return (
    <SidebarContext.Provider value={{ collapsed, toggle, collapse, expand }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
