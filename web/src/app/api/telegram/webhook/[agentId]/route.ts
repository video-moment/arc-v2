import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const update = await req.json();

  if (!update.message?.text) {
    return NextResponse.json({ ok: true });
  }

  const text = update.message.text;
  const senderName = update.message.from?.first_name || 'Unknown';
  const isBot = update.message.from?.is_bot === true;

  // 에이전트(봇)가 보낸 메시지만 저장 (사용자 메시지는 대시보드에서 이미 저장됨)
  if (!isBot) {
    return NextResponse.json({ ok: true });
  }

  try {
    // 에이전트의 최근 활성 세션 찾기
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const sessionId = sessions[0].id;

    // 봇의 답변을 assistant 역할로 저장
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: text,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[telegram/webhook]', err);
    return NextResponse.json({ ok: true }); // Telegram은 항상 200 응답 필요
  }
}
