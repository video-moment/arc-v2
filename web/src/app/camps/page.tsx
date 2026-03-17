'use client';

import { useEffect, useState } from 'react';
import { Server } from 'lucide-react';
import { getCamps, type Camp } from '@/lib/nextcamp-api';
import { Skeleton } from '@/components/ui/skeleton';

export default function CampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCamps()
      .then(setCamps)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">캠프</h1>
        <p className="text-sm text-muted-foreground">{camps.length}개의 캠프</p>
      </div>

      {camps.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-border bg-card">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-violet-500/10">
            <Server size={28} className="text-violet-500" />
          </div>
          <p className="font-medium mb-1">캠프가 없습니다</p>
          <p className="text-xs text-muted-foreground">등록된 캠프가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {camps.map(camp => (
            <div
              key={camp.id}
              className="p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 shrink-0">
                  <Server size={18} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{camp.name}</h3>
                    {camp.always_on ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-500 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        상시
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">수동</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{camp.machine}</p>
                </div>
              </div>

              {camp.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {camp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
