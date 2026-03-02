#!/usr/bin/env npx tsx
/**
 * 도화 스튜디오 Telegram ↔ Claude CLI 브릿지
 *
 * Telegram Bot API long polling으로 메시지를 수신하고,
 * Claude CLI (`claude -p`)로 응답을 생성한 뒤 Telegram으로 전송합니다.
 *
 * 사용법:
 *   npx tsx scripts/dohwa-bridge.ts
 *   # 또는 PM2:
 *   pm2 start scripts/dohwa-bridge.ts --interpreter "npx" --interpreter-args "tsx"
 */

import { spawn } from 'node:child_process';

// ── Config ──
const BOT_TOKEN = '8436323264:AAG8NzBsgbkHacIew5tq3PhE4R_sS_DX_3k';
const AGENT_ID = 'dohwa-studio';
const ARC_API = 'http://localhost:3300';
const DOHWA_PROJECT = '/Users/vimo/Desktop/ilju-mbti-project';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const POLL_TIMEOUT = 30; // long polling timeout (seconds)
const CLAUDE_TIMEOUT = 120_000; // 2 minutes max for claude CLI

let lastUpdateId = 0;

// ── Telegram API helpers ──
async function tgApi(method: string, body?: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function sendTyping(chatId: number | string) {
  await tgApi('sendChatAction', { chat_id: chatId, action: 'typing' });
}

async function sendMessage(chatId: number | string, text: string) {
  // Telegram 4096 char limit — split if needed
  const chunks = splitMessage(text, 4000);
  for (const chunk of chunks) {
    await tgApi('sendMessage', { chat_id: chatId, text: chunk });
  }
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Try to split at newline
    let splitIdx = remaining.lastIndexOf('\n', maxLen);
    if (splitIdx < maxLen * 0.5) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }
  return chunks;
}

// ── ARC API helper ──
async function pushToArc(sessionId: string | null, role: string, content: string) {
  try {
    const body: Record<string, string> = { role, content };
    if (sessionId) {
      body.sessionId = sessionId;
    } else {
      body.agentId = AGENT_ID;
    }

    const res = await fetch(`${ARC_API}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // If no session, try to create one first
    if (!sessionId) {
      // Create session + push message via MCP-like flow
      const sessions = await fetch(`${ARC_API}/api/chat/sessions?agentId=${AGENT_ID}`);
      const data = await sessions.json();
      const active = data.find?.((s: any) => s.status === 'active');

      if (active) {
        await fetch(`${ARC_API}/api/chat/sessions/${active.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, content }),
        });
        return active.id;
      }
    }

    if (sessionId) {
      await fetch(`${ARC_API}/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    }
    return sessionId;
  } catch (err) {
    console.error('[ARC] Push failed:', err);
    return sessionId;
  }
}

// ── Claude CLI call ──
function callClaude(userMessage: string): Promise<string> {
  return new Promise((resolve) => {
    // Remove ALL CLAUDE* env vars to prevent nested session detection
    const env = { ...process.env };
    for (const k of Object.keys(env)) {
      if (k.startsWith('CLAUDE')) delete env[k];
    }

    const child = spawn('claude', ['-p', userMessage, '--output-format', 'text'], {
      cwd: DOHWA_PROJECT,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Close stdin immediately — claude hangs if stdin stays open
    child.stdin.end();

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      console.error('[Claude] Timeout, killing process');
      child.kill('SIGTERM');
      resolve('죄송해요, 응답 생성 시간이 너무 오래 걸려서 중단됐어요. 다시 한번 말씀해 주시겠어요?');
    }, CLAUDE_TIMEOUT);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (stderr) console.error('[Claude] stderr:', stderr.slice(0, 200));
      if (code !== 0) {
        console.error('[Claude] Exit code:', code);
        resolve('죄송해요, 지금 응답을 생성하는 데 문제가 생겼어요. 잠시 후에 다시 시도해 주세요.');
        return;
      }
      resolve(stdout.trim() || '(응답 없음)');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      console.error('[Claude] Spawn error:', err.message);
      resolve('죄송해요, 지금 응답을 생성하는 데 문제가 생겼어요. 잠시 후에 다시 시도해 주세요.');
    });
  });
}

// ── Delete webhook (switch to polling) ──
async function deleteWebhook() {
  const result = await tgApi('deleteWebhook');
  console.log('[Telegram] Webhook deleted:', result);
}

// ── Main polling loop ──
async function pollLoop() {
  console.log(`[Bridge] 도화 스튜디오 Telegram 브릿지 시작`);
  console.log(`[Bridge] Bot token: ...${BOT_TOKEN.slice(-6)}`);
  console.log(`[Bridge] Project: ${DOHWA_PROJECT}`);
  console.log(`[Bridge] ARC API: ${ARC_API}`);

  // Delete existing webhook so we can use long polling
  await deleteWebhook();

  // Verify bot
  const me = await tgApi('getMe');
  if (!me.ok) {
    console.error('[Bridge] Bot verification failed:', me);
    process.exit(1);
  }
  console.log(`[Bridge] Bot: @${me.result.username} (${me.result.first_name})`);

  // Update ARC agent status to online
  try {
    await fetch(`${ARC_API}/api/agents/${AGENT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'online' }),
    });
    console.log('[ARC] Agent set to online');
  } catch {
    console.log('[ARC] Agent status update skipped (server not running?)');
  }

  let arcSessionId: string | null = null;
  const processing = new Set<number>(); // track processing update_ids

  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=${POLL_TIMEOUT}`);
      const data = await res.json();

      if (!data.ok || !data.result?.length) continue;

      for (const update of data.result) {
        lastUpdateId = update.update_id;

        const msg = update.message;
        if (!msg?.text) continue;
        if (msg.from?.is_bot) continue; // ignore bot messages

        const chatId = msg.chat.id;
        const userName = msg.from?.first_name || 'User';
        const text = msg.text;

        // Skip /start command
        if (text === '/start') {
          await sendMessage(chatId, '안녕하세요! 도화예요 😊\n무엇이든 물어보세요.');
          continue;
        }

        console.log(`[Message] ${userName}: ${text.slice(0, 80)}`);

        // Send typing indicator
        await sendTyping(chatId);

        // Push user message to ARC
        arcSessionId = await pushToArc(arcSessionId, userName, text);

        // Call Claude CLI
        console.log('[Claude] Calling CLI...');
        const startTime = Date.now();
        const response = await callClaude(text);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Claude] Done in ${elapsed}s, length=${response.length}`);
        console.log(`[Response] ${response.slice(0, 100)}`);

        // Send response to Telegram
        console.log('[Telegram] Sending response...');
        await sendMessage(chatId, response);
        console.log('[Telegram] Sent!');

        // Push response to ARC
        arcSessionId = await pushToArc(arcSessionId, 'assistant', response);
      }
    } catch (err) {
      console.error('[Poll] Error:', err);
      // Wait before retrying
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// ── Graceful shutdown ──
process.on('SIGINT', async () => {
  console.log('\n[Bridge] Shutting down...');
  try {
    await fetch(`${ARC_API}/api/agents/${AGENT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'offline' }),
    });
    console.log('[ARC] Agent set to offline');
  } catch {}
  process.exit(0);
});

process.on('SIGTERM', () => process.emit('SIGINT' as any));

// ── Start ──
pollLoop().catch(err => {
  console.error('[Bridge] Fatal error:', err);
  process.exit(1);
});
