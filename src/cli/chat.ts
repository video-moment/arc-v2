#!/usr/bin/env tsx
/**
 * NextCamp Terminal Chat
 *
 * 에이전트와 터미널에서 대화하는 인터랙티브 UI.
 * 화살표 키 선택, --resume으로 세션 유지, 스트리밍 응답.
 */

import * as readline from 'readline';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadTeams, loadTeam, loadMember } from '../core/config.js';
import { buildPrompt } from '../agents/prompt-builder.js';

// ── 색상 ──
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

// ── ANSI 유틸 ──
const hideCursor = () => process.stdout.write('\x1b[?25l');
const showCursor = () => process.stdout.write('\x1b[?25h');
const clearLine = () => process.stdout.write('\x1b[2K\r');
const moveUp = (n: number) => { if (n > 0) process.stdout.write(`\x1b[${n}A`); };

function print(text: string) { process.stdout.write(text); }
function println(text: string = '') { console.log(text); }

// ── 스피너 ──
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

class Spinner {
  private interval: ReturnType<typeof setInterval> | null = null;
  private frame = 0;
  private startTime = 0;
  private text = '';

  start(text: string) {
    this.text = text;
    this.startTime = Date.now();
    this.frame = 0;
    hideCursor();
    this.interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const s = SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length];
      clearLine();
      print(`  ${c.cyan}${s}${c.reset} ${c.dim}${this.text}${c.reset} ${c.gray}${elapsed}초${c.reset}`);
      this.frame++;
    }, 80);
  }

  update(text: string) { this.text = text; }

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    clearLine();
    showCursor();
  }
}

// ── 배너 ──
function banner() {
  println();
  println(`${c.bold}${c.green}  ╔═══════════════════════════════╗${c.reset}`);
  println(`${c.bold}${c.green}  ║       🏢 NextCamp Chat        ║${c.reset}`);
  println(`${c.bold}${c.green}  ╚═══════════════════════════════╝${c.reset}`);
  println();
}

function divider(ch = '─') {
  println(`${c.dim}  ${ch.repeat(36)}${c.reset}`);
}

// ── 에이전트 프로필 카드 ──
function showAgentProfile(name: string) {
  const member = loadMember(name);
  if (!member) return;

  println();
  println(`  ${c.magenta}┌─ ${c.bold}${name}${c.reset}${c.magenta} ─────────────────────────${c.reset}`);
  println(`  ${c.magenta}│${c.reset} ${c.dim}역할${c.reset} ${member.role}  ${c.dim}팀${c.reset} ${member.team}  ${c.dim}작업${c.reset} ${member.total_tasks}건${member.is_leader ? `  ${c.yellow}★ 팀장${c.reset}` : ''}`);

  if (member.strengths?.length > 0) {
    println(`  ${c.magenta}│${c.reset} ${c.green}강점${c.reset} ${member.strengths.join(', ')}`);
  }
  if (member.weaknesses?.length > 0) {
    println(`  ${c.magenta}│${c.reset} ${c.red}약점${c.reset} ${member.weaknesses.join(', ')}`);
  }

  if (member.learned?.length > 0) {
    const active = member.learned.filter(r => r.confidence >= 0.5);
    if (active.length > 0) {
      println(`  ${c.magenta}│${c.reset} ${c.cyan}학습${c.reset} ${active.length}개 규칙`);
      for (const rule of active.slice(0, 3)) {
        const pct = Math.round(rule.confidence * 100);
        const bar = pct >= 80 ? c.green : pct >= 50 ? c.yellow : c.red;
        println(`  ${c.magenta}│${c.reset}   ${bar}${pct}%${c.reset} ${rule.rule}`);
      }
    }
  }

  if (member.growth_log?.length > 0) {
    const recent = member.growth_log[member.growth_log.length - 1];
    println(`  ${c.magenta}│${c.reset} ${c.dim}최근${c.reset} ${recent.date} ${recent.event}`);
  }

  println(`  ${c.magenta}└──────────────────────────────────${c.reset}`);
}

// ── 키보드 선택 UI ──
interface SelectOption { label: string; value: string; description?: string; badge?: string; }

function select(title: string, options: SelectOption[]): Promise<string> {
  return new Promise((resolve) => {
    let cursor = 0;

    const renderOption = (opt: SelectOption, i: number) => {
      clearLine();
      const selected = i === cursor;
      const arrow = selected ? `${c.green}${c.bold} ▸ ` : `${c.dim}   `;
      const label = selected ? `${c.bold}${opt.label}${c.reset}` : `${opt.label}${c.reset}`;
      print(`  ${arrow}${label}`);
      if (opt.badge) print(`  ${opt.badge}`);
      if (opt.description) print(`  ${c.dim}${opt.description}${c.reset}`);
      println();
    };

    const render = () => {
      moveUp(options.length + 2);
      clearLine(); println(`  ${c.bold}${title}${c.reset}`);
      clearLine(); println(`  ${c.dim}↑↓ 이동  Enter 선택${c.reset}`);
      options.forEach((opt, i) => renderOption(opt, i));
    };

    // 초기 렌더
    println(`  ${c.bold}${title}${c.reset}`);
    println(`  ${c.dim}↑↓ 이동  Enter 선택${c.reset}`);
    options.forEach((opt, i) => renderOption(opt, i));

    hideCursor();
    const wasRaw = process.stdin.isRaw;
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();

    const onData = (key: Buffer) => {
      const s = key.toString();
      if (s === '\x03') { showCursor(); println(); process.exit(0); }
      if (s === '\x1b[A' || s === 'k') { cursor = (cursor - 1 + options.length) % options.length; render(); return; }
      if (s === '\x1b[B' || s === 'j') { cursor = (cursor + 1) % options.length; render(); return; }

      if (s === '\r' || s === '\n') {
        process.stdin.removeListener('data', onData);
        if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw ?? false);
        process.stdin.pause();
        showCursor();

        moveUp(options.length + 2);
        for (let i = 0; i < options.length + 2; i++) { clearLine(); println(); }
        moveUp(options.length + 2);
        clearLine();
        println(`  ${c.green}✓${c.reset} ${title} → ${c.bold}${c.cyan}${options[cursor].label}${c.reset}`);
        resolve(options[cursor].value);
      }
    };
    process.stdin.on('data', onData);
  });
}

// ── 팀/멤버 선택 ──
async function selectTeam(): Promise<string> {
  const teams = loadTeams();
  if (teams.length === 0) { println(`${c.yellow}  등록된 팀이 없습니다.${c.reset}`); process.exit(1); }
  return select('팀을 선택하세요', teams.map(t => ({
    label: t.name, value: t.id,
    description: `${t.leader?.name ?? '?'} 외 ${t.members?.length ?? 0}명`,
  })));
}

async function selectMember(teamId: string): Promise<string> {
  const team = loadTeam(teamId);
  if (!team) { println(`${c.yellow}  팀을 찾을 수 없습니다.${c.reset}`); process.exit(1); }
  return select(`${team.name} — 대화할 멤버`, [
    { label: team.leader.name, value: team.leader.name, description: team.leader.role, badge: `${c.yellow}★ 팀장${c.reset}` },
    ...(team.members ?? []).map(m => ({ label: m.name, value: m.name, description: m.role })),
  ]);
}

// ── Claude 호출 (fork + execSync 워커) ──
// 메인 스레드에서 스피너 애니메이션이 돌아가도록 fork()로 워커를 실행.
// 워커(claude-worker.ts)가 execSync로 claude를 호출하고 IPC로 결과 전달.
const __filename_chat = fileURLToPath(import.meta.url);
const __dirname_chat = dirname(__filename_chat);
const WORKER_PATH = join(__dirname_chat, 'claude-worker.ts');

function callClaude(
  message: string,
  systemPrompt: string | null,
  sessionId: string | null,
  agentName: string,
  spinner: Spinner,
): Promise<{ response: string; sessionId: string }> {
  return new Promise((resolve) => {
    const args = JSON.stringify({ message, systemPrompt, sessionId });
    const startTime = Date.now();

    const child = fork(WORKER_PATH, [args], {
      execArgv: ['--import', 'tsx'],
      silent: true,
    });

    child.on('message', (msg: any) => {
      spinner.stop();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      println();

      if (msg.ok) {
        const text = msg.response || '';
        const sid = msg.sessionId || sessionId || '';

        print(`  ${c.magenta}${agentName}${c.reset} ${c.dim}▸${c.reset} ${text}`);
        print(`\n  ${c.dim}(${elapsed}초)${c.reset}`);
        println();
        println();

        resolve({ response: text, sessionId: sid });
      } else {
        const text = msg.response || '[오류]';
        println(`  ${c.red}${agentName}${c.reset} ${c.dim}▸${c.reset} ${text}`);
        println();
        resolve({ response: text, sessionId: sessionId ?? '' });
      }
    });

    child.on('error', (err) => {
      spinner.stop();
      println();
      println(`  ${c.red}${agentName}${c.reset} ${c.dim}▸${c.reset} [워커 오류] ${err.message}`);
      println();
      resolve({ response: `[워커 오류] ${err.message}`, sessionId: sessionId ?? '' });
    });

    child.on('exit', (code) => {
      if (code && code !== 0) {
        spinner.stop();
        println();
        println(`  ${c.red}${agentName}${c.reset} ${c.dim}▸${c.reset} [워커 종료: 코드 ${code}]`);
        println();
        resolve({ response: `[워커 종료: 코드 ${code}]`, sessionId: sessionId ?? '' });
      }
    });
  });
}

// ── readline ──
function createRL(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}
function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise(resolve => rl.question(q, a => resolve(a.trim())));
}

// ── 채팅 루프 ──
async function chatLoop(
  rl: readline.Interface,
  built: ReturnType<typeof buildPrompt>,
): Promise<void> {
  let currentBuilt = built;
  let sessionId: string | null = null;
  const spinner = new Spinner();
  let messageCount = 0;

  while (true) {
    const input = await ask(rl, `  ${c.bold}${c.green}CEO${c.reset} ${c.dim}▸${c.reset} `);
    if (!input) continue;

    if (['끝', 'exit', 'quit', '나가기', 'q'].includes(input.toLowerCase())) {
      println();
      divider('═');
      println(`  ${c.dim}대화 종료 — ${messageCount}건${c.reset}`);
      if (sessionId) println(`  ${c.dim}세션: ${sessionId}${c.reset}`);
      divider('═');
      println();
      rl.close();
      return;
    }

    if (['변경', 'switch', '다른멤버'].includes(input.toLowerCase())) {
      rl.close();
      println();
      const newTeamId = await selectTeam();
      println();
      const newMember = await selectMember(newTeamId);
      currentBuilt = buildPrompt({ memberName: newMember, teamId: newTeamId });
      sessionId = null; // 새 세션
      messageCount = 0;

      showAgentProfile(currentBuilt.agentName);
      println();
      divider();
      println(`  ${c.dim}종료: "끝"  멤버 변경: "변경"${c.reset}`);
      divider();
      println();

      await chatLoop(createRL(), currentBuilt);
      return;
    }

    messageCount++;

    // 첫 메시지: --system-prompt로 에이전트 정체성 주입
    // 이후 메시지: --resume으로 세션 이어가기 (빠름)
    spinner.start(sessionId ? '응답 대기 중...' : '세션 시작 중...');

    const result = await callClaude(
      input,
      currentBuilt.prompt,
      sessionId,
      currentBuilt.agentName,
      spinner,
    );
    sessionId = result.sessionId;
  }
}

// ── 메인 ──
async function main() {
  banner();

  const teamId = await selectTeam();
  println();
  const memberName = await selectMember(teamId);
  const built = buildPrompt({ memberName, teamId });

  showAgentProfile(built.agentName);

  println();
  divider();
  println(`  ${c.dim}종료: "끝"  멤버 변경: "변경"${c.reset}`);
  divider();
  println();

  const rl = createRL();
  await chatLoop(rl, built);
}

main().catch(err => {
  console.error('NextCamp Chat 오류:', err.message);
  process.exit(1);
});
