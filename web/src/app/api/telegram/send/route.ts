import { NextRequest, NextResponse } from 'next/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionStr = process.env.TELEGRAM_SESSION || '';

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
        { error: 'TELEGRAM_SESSION 환경변수가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    const { agentId, message } = await req.json();
    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'agentId, message 필수' },
        { status: 400 }
      );
    }

    // Supabase에서 에이전트의 telegramChatId 조회
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: agent, error } = await supabase
      .from('agents')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('id', agentId)
      .single();

    if (error || !agent?.telegram_bot_token) {
      return NextResponse.json(
        { error: '에이전트의 텔레그램 봇 토큰을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const client = await getClient();

    // 봇 토큰으로 봇 username 조회 → User API에서 entity resolve
    const botInfoRes = await fetch(
      'https://api.telegram.org/bot' + agent.telegram_bot_token + '/getMe'
    );
    const botInfo = await botInfoRes.json();
    const botUsername = botInfo.result?.username;

    if (!botUsername) {
      return NextResponse.json(
        { error: '봇 username을 가져올 수 없습니다' },
        { status: 500 }
      );
    }

    const result = await client.sendMessage(botUsername, {
      message,
    });

    // 메시지 전송 시 에이전트 last_seen 갱신
    await supabase
      .from('agents')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', agentId);

    return NextResponse.json({ ok: true, messageId: result.id });
  } catch (err: any) {
    console.error('[telegram/send]', err);
    // 연결 실패 시 캐시 초기화
    clientPromise = null;
    return NextResponse.json(
      { error: err.message || '전송 실패' },
      { status: 500 }
    );
  }
}
