'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AgentMessage, WsEvent } from '@/lib/arc-types';

function getWsUrl() {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return 'ws://localhost:3200/ws';
}

export function useAgentStream(sessionId: string | null) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  sessionIdRef.current = sessionId;

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const url = getWsUrl();
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (sessionIdRef.current) {
          ws.send(JSON.stringify({ type: 'subscribe', sessionId: sessionIdRef.current }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const wsEvent: WsEvent = JSON.parse(event.data);
          if (wsEvent.type === 'agent_message') {
            const msg = wsEvent.payload as AgentMessage;
            setMessages(prev => [...prev, msg]);

            if (msg.type === 'plan_proposal' && msg.to === 'user') {
              setPaused(true);
            }
            if (msg.type === 'plan_approved') {
              setPaused(false);
            }
          } else if (wsEvent.type === 'pipeline_error') {
            const errPayload = wsEvent.payload as { error: string };
            setPipelineError(errPayload.error || 'Pipeline failed');
            setCompleted(true);
            setPaused(false);
          } else if (wsEvent.type === 'session_completed') {
            setCompleted(true);
            setPaused(false);
          } else if (wsEvent.type === 'status_change') {
            const info = wsEvent.payload as { status?: string };
            if (info.status === 'paused') setPaused(true);
            if (info.status === 'running') setPaused(false);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !wsRef.current) return;
    const ws = wsRef.current;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', sessionId }));
    }
  }, [sessionId]);

  const reset = useCallback(() => {
    setMessages([]);
    setCompleted(false);
    setPaused(false);
    setPipelineError(null);
  }, []);

  return { messages, connected, completed, paused, pipelineError, reset };
}
