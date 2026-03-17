import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { LayoutMain } from '@/components/LayoutMain';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'NextCamp',
  description: '에이전트 업무 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="antialiased">
        <TooltipProvider>
          <SidebarProvider>
            <Sidebar />
            <LayoutMain>{children}</LayoutMain>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
