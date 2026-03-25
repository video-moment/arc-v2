'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Monitor, Users, UserCircle, TrendingUp, MessagesSquare, ScrollText,
  Timer, FileText, ChevronLeft, ChevronRight, Layers, Eye, Pencil, CalendarDays,
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
      { href: '/', label: '현황', icon: <Monitor size={17} /> },
      { href: '/camps', label: '캠프', icon: <Layers size={17} /> },
    ],
  },
  {
    label: '조직',
    items: [
      { href: '/teams', label: '팀', icon: <Users size={17} /> },
      { href: '/members', label: '멤버', icon: <UserCircle size={17} /> },
      { href: '/growth', label: '성장', icon: <TrendingUp size={17} /> },
    ],
  },
  {
    label: '운영',
    items: [
      { href: '/meetings', label: '팀장 회의', icon: <MessagesSquare size={17} /> },
      { href: '/logs', label: '작업 로그', icon: <ScrollText size={17} /> },
    ],
  },
];

const WORKSPACE_SECTIONS: NavSection[] = [
  {
    label: '도구',
    items: [
      { href: '/tasks', label: '목표', icon: <Timer size={17} /> },
      { href: '/tasks/weekly', label: '주간 리뷰', icon: <CalendarDays size={17} /> },
      { href: '/notes', label: '노트', icon: <FileText size={17} /> },
    ],
  },
];

const MODE_CONFIG: Record<AppMode, { label: string; switchLabel: string; icon: React.ReactNode; gradient: string }> = {
  monitor: { label: '모니터링', switchLabel: '모니터링으로', icon: <Eye size={13} />, gradient: 'from-emerald-400 to-teal-500' },
  workspace: { label: '워크스페이스', switchLabel: '워크스페이스로', icon: <Pencil size={13} />, gradient: 'from-violet-400 to-indigo-500' },
};

const HIDDEN_SIDEBAR_PATHS = ['/notes'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle, mode, setMode } = useSidebar();

  if (HIDDEN_SIDEBAR_PATHS.some(p => pathname.startsWith(p))) {
    return null;
  }

  const sections = mode === 'monitor' ? MONITOR_SECTIONS : WORKSPACE_SECTIONS;
  const otherMode: AppMode = mode === 'monitor' ? 'workspace' : 'monitor';
  const currentConfig = MODE_CONFIG[mode];
  const otherConfig = MODE_CONFIG[otherMode];

  const handleModeSwitch = () => {
    setMode(otherMode);
    if (otherMode === 'monitor') {
      router.push('/');
    } else {
      router.push('/tasks');
    }
  };

  return (
    <TooltipProvider>
      <aside
        className="fixed left-0 top-0 h-full flex flex-col z-50 transition-all duration-300 bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
        style={{
          width: collapsed ? '60px' : '240px',
        }}
      >
        {/* Logo + Toggle */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'} pt-6 pb-5`}>
          {!collapsed && (
            <Link href={mode === 'monitor' ? '/' : '/tasks'} className="flex items-center gap-3 group">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 bg-gradient-to-br ${currentConfig.gradient} shadow-lg`}
                style={{ boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)' }}>
                N
              </div>
              <div>
                <span className="text-[13px] font-bold tracking-tight text-sidebar-foreground">
                  NextCamp
                </span>
                <p className="text-[10px] leading-tight text-sidebar-foreground/50 font-medium">
                  {currentConfig.label}
                </p>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            className="shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
            title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </Button>
        </div>

        {/* Mode Switcher */}
        <div className="px-3 mb-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={<button onClick={handleModeSwitch} />}
                className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
              >
                {otherConfig.icon}
              </TooltipTrigger>
              <TooltipContent side="right">{otherConfig.switchLabel} 전환</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleModeSwitch}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200"
            >
              {otherConfig.icon}
              <span>{otherConfig.switchLabel} 전환</span>
            </button>
          )}
        </div>

        <div className="mx-4 h-px bg-sidebar-border/50" />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto mt-4">
          {sections.map((section, sIdx) => (
            <div key={section.label}>
              {sIdx > 0 && (
                <div className="my-3 mx-1 h-px bg-sidebar-border/40" />
              )}
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/45">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon }) => {
                  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

                  const navContent = (
                    <>
                      <span className={`transition-colors duration-200 ${active ? 'text-primary' : ''}`}>{icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{label}</span>
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-glow" />
                          )}
                        </>
                      )}
                    </>
                  );

                  const classes = [
                    'flex items-center py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200',
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
                  ].join(' ');

                  if (collapsed) {
                    return (
                      <Tooltip key={href}>
                        <TooltipTrigger render={<Link href={href} />} className={classes}>
                          {navContent}
                        </TooltipTrigger>
                        <TooltipContent side="right">{label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link key={href} href={href} className={classes}>
                      {navContent}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`${collapsed ? 'px-3 justify-center' : 'px-5'} py-4 flex border-t border-sidebar-border`}>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            {!collapsed && (
              <span className="text-[11px] text-sidebar-foreground/50 font-medium">
                연결됨
              </span>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
