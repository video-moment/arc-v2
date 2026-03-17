'use client';

import { ScrollText } from 'lucide-react';

export default function LogsPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">작업 로그</h1>
        <p className="text-sm text-muted-foreground">에이전트 작업 기록</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <ScrollText className="mx-auto mb-4 text-muted-foreground/40" size={48} />
        <p className="text-muted-foreground">준비 중입니다</p>
        <p className="text-xs text-muted-foreground/60 mt-1">작업 로그 기능은 곧 추가됩니다</p>
      </div>
    </div>
  );
}
