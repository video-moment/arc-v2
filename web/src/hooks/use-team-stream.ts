'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AgentMessage, AgentName, WsEvent, SessionInfo } from '@/lib/arc-types';

function getWsUrl() {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return 'ws://localhost:3200/ws';
}

export interface AgentState {
  name: AgentName;
  status: 'idle' | 'active';
  sessionId: string | null;
  lastMessage: string | null;
  lastTimestamp: number | null;
}

export interface PlanApprovalState {
  sessionId: string;
  research: string | null;
  plan: string | null;
  paused: boolean;
}

export type PipelineStage = 'idle' | 'planner' | 'actor' | 'reviewer' | 'completed' | 'error';

export interface PipelineProgress {
  topic: string | null;
  stage: PipelineStage;
  sessionId: string | null;
}

interface TeamStreamResult {
  agentStates: Record<'planner' | 'actor' | 'reviewer', AgentState>;
  activeSessions: Set<string>;
  connected: boolean;
  planApproval: PlanApprovalState | null;
  pipeline: PipelineProgress;
}

const defaultAgentState = (name: AgentName): AgentState => ({
  name,
  status: 'idle',
  sessionId: null,
  lastMessage: null,
  lastTimestamp: null,
});

export function useTeamStream(domainId: string | null): TeamStreamResult {
  const [agentStates, setAgentStates] = useState<Record<'planner' | 'actor' | 'reviewer', AgentState>>({
    planner: defaultAgentState('planner'),
    actor: defaultAgentState('actor'),
    reviewer: defaultAgentState('reviewer'),
  });
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [planApproval, setPlanApproval] = useState<PlanApprovalState | null>(null);
  const [pipeline, setPipeline] = useState<PipelineProgress>({ topic: null, stage: 'idle', sessionId: null });
  const wsRef = useRef<WebSocket | null>(null);
  const domainIdRef = useRef(domainId);

  domainIdRef.current = domainId;

  const reset = useCallback(() => {
    setAgentStates({
      planner: defaultAgentState('planner'),
      actor: defaultAgentState('actor'),
      reviewer: defaultAgentState('reviewer'),
    });
    setActiveSessions(new Set());
    setPlanApproval(null);
    setPipeline({ topic: null, stage: 'idle', sessionId: null });
  }, []);

  useEffect(() => {
    reset();
  }, [domainId, reset]);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const url = getWsUrl();
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: 'subscribe', sessionId: '*' }));
      };

      ws.onmessage = (event) => {
        try {
          const wsEvent: WsEvent = JSON.parse(event.data);

          if (wsEvent.type === 'agent_message') {
            const msg = wsEvent.payload as AgentMessage;

            const msgDomainId = (msg.metadata?.domainId as string) || null;
            if (domainIdRef.current && msgDomainId && msgDomainId !== domainIdRef.current) {
              return;
            }

            if (msg.type === 'research' && msg.to === 'user') {
              setPlanApproval(prev => ({
                sessionId: msg.sessionId,
                research: msg.content,
                plan: prev?.sessionId === msg.sessionId ? prev.plan : null,
                paused: false,
              }));
            } else if (msg.type === 'plan_proposal' && msg.to === 'user') {
              setPlanApproval(prev => ({
                sessionId: msg.sessionId,
                research: prev?.sessionId === msg.sessionId ? prev.research : null,
                plan: msg.content,
                paused: true,
              }));
            } else if (msg.type === 'plan_approved') {
              setPlanApproval(null);
            }

            if (msg.type === 'user_input' && msg.from === 'user') {
              const topicText = msg.content.length > 60 ? msg.content.slice(0, 57) + '...' : msg.content;
              setPipeline({ topic: topicText, stage: 'planner', sessionId: msg.sessionId });
            }

            const agentName = msg.from as 'planner' | 'actor' | 'reviewer';

            if (agentName === 'planner' || agentName === 'actor' || agentName === 'reviewer') {
              setPipeline(prev => prev.sessionId === msg.sessionId ? { ...prev, stage: agentName } : prev);

              setAgentStates(prev => ({
                ...prev,
                [agentName]: {
                  name: agentName,
                  status: 'active',
                  sessionId: msg.sessionId,
                  lastMessage: msg.content.slice(0, 120),
                  lastTimestamp: msg.timestamp,
                },
              }));

              setActiveSessions(prev => {
                const next = new Set(prev);
                next.add(msg.sessionId);
                return next;
              });

              setTimeout(() => {
                setAgentStates(prev => {
                  if (prev[agentName].lastTimestamp === msg.timestamp) {
                    return {
                      ...prev,
                      [agentName]: { ...prev[agentName], status: 'idle' },
                    };
                  }
                  return prev;
                });
              }, 5000);
            }
          } else if (wsEvent.type === 'status_change') {
            const info = wsEvent.payload as SessionInfo;
            if (info.status === 'paused') {
              setPlanApproval(prev => prev ? { ...prev, paused: true } : prev);
            } else if (info.status === 'running') {
              setPlanApproval(null);
            }
          } else if (wsEvent.type === 'pipeline_error') {
            setPipeline(prev => ({ ...prev, stage: 'error' }));
          } else if (wsEvent.type === 'session_completed') {
            const session = wsEvent.payload as { sessionId?: string };
            if (session.sessionId) {
              setActiveSessions(prev => {
                const next = new Set(prev);
                next.delete(session.sessionId!);
                return next;
              });
            }
            setAgentStates({
              planner: defaultAgentState('planner'),
              actor: defaultAgentState('actor'),
              reviewer: defaultAgentState('reviewer'),
            });
            setPlanApproval(null);
            setPipeline(prev => ({ ...prev, stage: 'completed' }));
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

  return { agentStates, activeSessions, connected, planApproval, pipeline };
}
