'use client';

import { MessagesSquare } from 'lucide-react';

export default function MeetingsPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">팀장 회의</h1>
        <p className="text-sm text-muted-foreground">팀장들의 정기 회의 기록</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <MessagesSquare className="mx-auto mb-4 text-muted-foreground/40" size={48} />
        <p className="text-muted-foreground">준비 중입니다</p>
        <p className="text-xs text-muted-foreground/60 mt-1">팀장 회의 기능은 Phase 4에서 구현됩니다</p>
      </div>
    </div>
  );
}
