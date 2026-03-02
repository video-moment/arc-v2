import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { LayoutMain } from '@/components/LayoutMain';

export const metadata: Metadata = {
  title: 'ARC V2',
  description: '에이전트 모니터링 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="antialiased">
        <SidebarProvider>
          <Sidebar />
          <LayoutMain>{children}</LayoutMain>
        </SidebarProvider>
      </body>
    </html>
  );
}
