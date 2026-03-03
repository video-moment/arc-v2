'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import type { ChatMessage, MessageReaction } from './api';

function toMessage(row: any): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
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

function toReaction(row: any): MessageReaction {
  return {
    id: row.id,
    messageId: row.message_id,
    agentId: row.agent_id,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

export function useRealtimeReactions(
  messageIds: string[],
  onNewReaction: (reaction: MessageReaction) => void
) {
  const callbackRef = useRef(onNewReaction);
  callbackRef.current = onNewReaction;
  const idsRef = useRef(messageIds);
  idsRef.current = messageIds;

  useEffect(() => {
    if (messageIds.length === 0) return;

    const channel = supabase
      .channel('reactions:' + messageIds[0]?.slice(0, 8))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          const reaction = toReaction(payload.new);
          if (idsRef.current.includes(reaction.messageId)) {
            callbackRef.current(reaction);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageIds.length > 0 ? messageIds[0] : null]);
}
