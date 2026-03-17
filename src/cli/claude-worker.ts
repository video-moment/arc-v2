/**
 * Claude 호출 워커 — 메인 스레드의 스피너를 차단하지 않기 위해 분리.
 * fork()로 실행되며, IPC로 결과를 전달한다.
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const args = JSON.parse(process.argv[2]);
const { message, systemPrompt, sessionId } = args;

const env = { ...process.env };
delete env.CLAUDECODE;

const tmpMsg = join(tmpdir(), `nextcamp-msg-${Date.now()}.txt`);
writeFileSync(tmpMsg, message, 'utf-8');

let cmd = `claude -p "$(cat '${tmpMsg}')" --output-format json --tools "" --strict-mcp-config --setting-sources ""`;

let tmpSys: string | null = null;
if (systemPrompt) {
  tmpSys = join(tmpdir(), `nextcamp-sys-${Date.now()}.txt`);
  writeFileSync(tmpSys, systemPrompt, 'utf-8');
  cmd += ` --system-prompt "$(cat '${tmpSys}')"`;
}
if (sessionId) {
  cmd += ` --resume '${sessionId}'`;
}

try {
  const raw = execSync(cmd, {
    encoding: 'utf-8',
    env,
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
    cwd: tmpdir(),
  });

  try { unlinkSync(tmpMsg); } catch {}
  if (tmpSys) try { unlinkSync(tmpSys); } catch {}

  try {
    const result = JSON.parse(raw);
    process.send!({
      ok: true,
      response: result.result || '',
      sessionId: result.session_id || sessionId || '',
      durationMs: result.duration_ms || 0,
    });
  } catch {
    process.send!({
      ok: true,
      response: raw.trim(),
      sessionId: sessionId || '',
      durationMs: 0,
    });
  }
} catch (err: any) {
  try { unlinkSync(tmpMsg); } catch {}
  if (tmpSys) try { unlinkSync(tmpSys); } catch {}

  process.send!({
    ok: false,
    response: err.stdout?.trim() || err.message || '[오류]',
    sessionId: sessionId || '',
    durationMs: 0,
  });
}
