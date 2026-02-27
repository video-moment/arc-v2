import { spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { AgentDef } from '../types.js';

const TMP_DIR = resolve(process.cwd(), '.arc-tmp');

export interface RunResult {
  output: string;
  exitCode: number | null;
}

export class AgentRunner extends EventEmitter {
  private processes = new Map<string, ChildProcess>();

  /** Run agent with a message, return full response */
  async run(agent: AgentDef, message: string, sessionId: string): Promise<RunResult> {
    const maxTurns = String(agent.maxTurns || 10);
    const args = ['--print', '--output-format', 'text', '--max-turns', maxTurns];

    // System prompt → temp file
    let tmpFile: string | null = null;
    if (agent.systemPrompt) {
      mkdirSync(TMP_DIR, { recursive: true });
      tmpFile = join(TMP_DIR, `sp-${randomUUID()}.txt`);
      writeFileSync(tmpFile, agent.systemPrompt, 'utf-8');
      args.push('--system-prompt', tmpFile);
    }

    if (agent.model) {
      args.push('--model', agent.model);
    }

    if (agent.allowedTools?.length) {
      for (const tool of agent.allowedTools) {
        args.push('--allowedTools', tool);
      }
    }

    // Message via stdin
    args.push('-');

    return new Promise<RunResult>((resolvePromise, reject) => {
      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      // Clean env to prevent nested Claude Code sessions
      const env = { ...process.env };
      delete env['CLAUDECODE'];
      delete env['CLAUDE_CODE_ENTRYPOINT'];

      const proc = spawn('claude', args, {
        cwd: agent.workingDir || process.cwd(),
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.processes.set(sessionId, proc);

      // Write message to stdin
      proc.stdin?.write(message);
      proc.stdin?.end();

      const timeout = 120_000;
      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        cleanup();
        reject(new Error(`Agent timeout after ${timeout}ms`));
      }, timeout);

      const cleanup = () => {
        this.processes.delete(sessionId);
        if (tmpFile) {
          try { unlinkSync(tmpFile); } catch {}
        }
      };

      proc.stdout?.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        this.emit('stdout', { sessionId, chunk: chunk.toString() });
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        errChunks.push(chunk);
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        cleanup();
        const output = Buffer.concat(chunks).toString().trim();
        resolvePromise({ output, exitCode: code });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        cleanup();
        reject(err);
      });
    });
  }

  /** Stop a running agent process */
  stop(sessionId: string): void {
    const proc = this.processes.get(sessionId);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(sessionId);
    }
  }

  get runningCount(): number {
    return this.processes.size;
  }
}
