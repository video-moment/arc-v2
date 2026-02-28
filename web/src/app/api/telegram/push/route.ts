import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { agentId, content, role } = await req.json();

    if (!agentId || !content || !role) {
      return NextResponse.json(
        { error: 'agentId, content, role 필수' },
        { status: 400 }
      );
    }

    // 에이전트의 최근 세션 찾기 (없으면 생성)
    let { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1);

    let sessionId: string;

    if (sessions && sessions.length > 0) {
      sessionId = sessions[0].id;
    } else {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ agent_id: agentId, title: agentId + ' 대화' })
        .select('id')
        .single();

      if (sessionError || !newSession) {
        return NextResponse.json(
          { error: '세션 생성 실패' },
          { status: 500 }
        );
      }
      sessionId = newSession.id;
    }

    // 메시지 저장
    const { data: msg, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messageId: msg.id, sessionId });
  } catch (err: any) {
    console.error('[telegram/push]', err);
    return NextResponse.json(
      { error: err.message || '저장 실패' },
      { status: 500 }
    );
  }
}
