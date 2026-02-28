import { NextRequest, NextResponse } from 'next/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';
import { createClient } from '@supabase/supabase-js';

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionStr = process.env.TELEGRAM_SESSION || '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

let clientPromise: Promise<TelegramClient> | null = null;

function getClient(): Promise<TelegramClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const session = new StringSession(sessionStr);
      const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 3,
      });
      await client.connect();
      return client;
    })();
  }
  return clientPromise;
}

export async function POST(req: NextRequest) {
  try {
    if (!sessionStr) {
      return NextResponse.json(
        { error: 'TELEGRAM_SESSION 환경변수 없음' },
        { status: 500 }
      );
    }

    const { agentId } = await req.json();
    if (!agentId) {
      return NextResponse.json({ error: 'agentId 필수' }, { status: 400 });
    }

    // 에이전트의 봇 토큰 조회
    const { data: agent } = await supabase
      .from('agents')
      .select('telegram_bot_token')
      .eq('id', agentId)
      .single();

    if (!agent?.telegram_bot_token) {
      return NextResponse.json({ error: '에이전트 봇 토큰 없음' }, { status: 404 });
    }

    // 봇 username 조회
    const botInfoRes = await fetch(
      'https://api.telegram.org/bot' + agent.telegram_bot_token + '/getMe'
    );
    const botInfo = await botInfoRes.json();
    const botUsername = botInfo.result?.username;
    const botId = botInfo.result?.id;

    if (!botUsername) {
      return NextResponse.json({ error: '봇 정보 조회 실패' }, { status: 500 });
    }

    // User API로 봇과의 최근 메시지 가져오기
    const client = await getClient();
    const messages = await client.getMessages(botUsername, { limit: 30 });

    // 에이전트의 세션 찾기/생성
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
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({ agent_id: agentId, title: agentId + ' 대화' })
        .select('id')
        .single();
      if (!newSession) {
        return NextResponse.json({ error: '세션 생성 실패' }, { status: 500 });
      }
      sessionId = newSession.id;
    }

    // 기존 메시지 조회 (중복 방지: content + role 조합)
    const { data: existing } = await supabase
      .from('chat_messages')
      .select('content, role, created_at')
      .eq('session_id', sessionId);

    const existingSet = new Set(
      (existing || []).map((m: any) => m.role + '::' + m.content)
    );

    // 새 메시지만 저장 (오래된 순서로)
    let synced = 0;
    for (const msg of [...messages].reverse()) {
      if (!msg.message) continue;

      const senderId = String(msg.senderId?.valueOf() ?? '');
      const isBot = senderId === String(botId);
      const role = isBot ? 'assistant' : 'user';

      const key = role + '::' + msg.message;
      if (existingSet.has(key)) continue;
      existingSet.add(key);

      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role,
        content: msg.message,
        created_at: new Date(msg.date * 1000).toISOString(),
      });

      if (!error) synced++;
    }

    return NextResponse.json({ ok: true, synced, sessionId });
  } catch (err: any) {
    console.error('[telegram/sync]', err);
    clientPromise = null;
    return NextResponse.json(
      { error: err.message || '동기화 실패' },
      { status: 500 }
    );
  }
}
