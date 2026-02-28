'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import type { ChatMessage } from './api';

function toMessage(row: any): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function useRealtimeMessages(
  sessionId: string | null,
  onNewMessage: (message: ChatMessage) => void
) {
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('chat:' + sessionId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: 'session_id=eq.' + sessionId,
        },
        (payload) => {
          callbackRef.current(toMessage(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);
}
