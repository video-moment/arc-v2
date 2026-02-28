import { NextRequest, NextResponse } from 'next/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step } = body;

    if (step === 'phone') {
      const { phone } = body;
      if (!phone) {
        return NextResponse.json({ error: 'phone 필수' }, { status: 400 });
      }

      const session = new StringSession('');
      const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 3,
      });
      await client.connect();

      const result = await client.invoke(
        new Api.auth.SendCode({
          phoneNumber: phone,
          apiId,
          apiHash,
          settings: new Api.CodeSettings({}),
        })
      );

      const tempSession = client.session.save() as unknown as string;
      await client.disconnect();

      if (!('phoneCodeHash' in result)) {
        return NextResponse.json({ error: '이미 인증됨' }, { status: 400 });
      }

      return NextResponse.json({
        phoneCodeHash: (result as any).phoneCodeHash,
        tempSession,
      });
    }

    if (step === 'code') {
      const { phone, code, phoneCodeHash, tempSession } = body;
      if (!phone || !code || !phoneCodeHash || !tempSession) {
        return NextResponse.json(
          { error: 'phone, code, phoneCodeHash, tempSession 필수' },
          { status: 400 }
        );
      }

      const session = new StringSession(tempSession);
      const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 3,
      });
      await client.connect();

      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash,
          phoneCode: code,
        })
      );

      const savedSession = client.session.save() as unknown as string;
      await client.disconnect();

      return NextResponse.json({ session: savedSession });
    }

    return NextResponse.json({ error: '잘못된 step' }, { status: 400 });
  } catch (err: any) {
    console.error('[telegram/auth]', err);
    return NextResponse.json(
      { error: err.message || '인증 실패' },
      { status: 500 }
    );
  }
}
