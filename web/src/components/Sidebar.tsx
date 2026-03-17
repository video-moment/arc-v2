'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Monitor, Users, UserCircle, TrendingUp, MessagesSquare, ScrollText,
  Timer, FileText, ChevronLeft, ChevronRight, Layers, Eye, Pencil,
} from 'lucide-react';

import { useSidebar, type AppMode } from './SidebarContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const MONITOR_SECTIONS: NavSection[] = [
  {
    label: '회사',
    items: [
      { href: '/', label: '현황', icon: <Monitor size={18} /> },
      { href: '/camps', label: '캠프', icon: <Layers size={18} /> },
    ],
  },
  {
    label: '조직',
    items: [
      { href: '/teams', label: '팀', icon: <Users size={18} /> },
      { href: '/members', label: '멤버', icon: <UserCircle size={18} /> },
      { href: '/growth', label: '성장', icon: <TrendingUp size={18} /> },
    ],
  },
  {
    label: '운영',
    items: [
      { href: '/meetings', label: '팀장 회의', icon: <MessagesSquare size={18} /> },
      { href: '/logs', label: '작업 로그', icon: <ScrollText size={18} /> },
    ],
  },
];

const WORKSPACE_SECTIONS: NavSection[] = [
  {
    label: '도구',
    items: [
      { href: '/pomodoro', label: '할 일', icon: <Timer size={18} /> },
      { href: '/notes', label: '노트', icon: <FileText size={18} /> },
    ],
  },
];

const MODE_CONFIG: Record<AppMode, { label: string; switchLabel: string; icon: React.ReactNode; color: string }> = {
  monitor: { label: '모니터링', switchLabel: '모니터링으로', icon: <Eye size={14} />, color: 'from-emerald-500 to-teal-600' },
  workspace: { label: '워크스페이스', switchLabel: '워크스페이스로', icon: <Pencil size={14} />, color: 'from-blue-500 to-indigo-600' },
};

const HIDDEN_SIDEBAR_PATHS = ['/notes'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle, mode, setMode } = useSidebar();

  // 노트 등 전용 레이아웃 페이지에서는 글로벌 사이드바 숨김
  if (HIDDEN_SIDEBAR_PATHS.some(p => pathname.startsWith(p))) {
    return null;
  }

  const sections = mode === 'monitor' ? MONITOR_SECTIONS : WORKSPACE_SECTIONS;
  const otherMode: AppMode = mode === 'monitor' ? 'workspace' : 'monitor';
  const currentConfig = MODE_CONFIG[mode];
  const otherConfig = MODE_CONFIG[otherMode];

  // 모드 전환 시 해당 모드의 첫 페이지로 이동
  const handleModeSwitch = () => {
    setMode(otherMode);
    if (otherMode === 'monitor') {
      router.push('/');
    } else {
      router.push('/pomodoro');
    }
  };

  return (
    <TooltipProvider>
      <aside
        className="fixed left-0 top-0 h-full flex flex-col z-50 transition-all duration-300 bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
        style={{ width: collapsed ? '56px' : '240px' }}
      >
        {/* Logo + Toggle */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-6'} py-6`}>
          {!collapsed && (
            <Link href={mode === 'monitor' ? '/' : '/pomodoro'} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-gradient-to-br ${currentConfig.color}`}>
                N
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                  NextCamp
                </span>
                <p className="text-[10px] leading-tight text-sidebar-foreground/50">
                  {currentConfig.label}
                </p>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </Button>
        </div>

        {/* Mode Switcher */}
        <div className="px-2 mb-2">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={<button onClick={handleModeSwitch} />}
                className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                {otherConfig.icon}
              </TooltipTrigger>
              <TooltipContent side="right">{otherConfig.switchLabel} 전환</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleModeSwitch}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              {otherConfig.icon}
              <span>{otherConfig.switchLabel} 전환</span>
            </button>
          )}
        </div>

        <Separator className="mx-3 bg-sidebar-border" />

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-4 overflow-y-auto mt-2">
          {sections.map((section, sIdx) => (
            <div key={section.label}>
              {sIdx > 0 && (
                <Separator className="my-2 mx-1 bg-sidebar-border" />
              )}
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon }) => {
                  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                  const linkEl = (
                    <Link
                      key={href}
                      href={href}
                      className={[
                        'flex items-center py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                      ].join(' ')}
                    >
                      <span className={active ? 'opacity-100' : 'opacity-60'}>{icon}</span>
                      {!collapsed && label}
                      {!collapsed && active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={href}>
                        <TooltipTrigger render={<Link href={href} />} className={[
                          'flex items-center py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 justify-center px-0',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        ].join(' ')}>
                          <span className={active ? 'opacity-100' : 'opacity-60'}>{icon}</span>
                        </TooltipTrigger>
                        <TooltipContent side="right">{label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkEl;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`${collapsed ? 'px-2 justify-center' : 'px-6'} py-4 flex border-t border-sidebar-border`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse bg-green-500 shrink-0" />
            {!collapsed && (
              <span className="text-[11px] text-sidebar-foreground/50">
                백엔드 연결됨
              </span>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
