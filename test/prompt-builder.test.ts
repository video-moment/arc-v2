import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../src/engine/prompt-builder.js';
import type { ChatMessage } from '../src/types.js';

function msg(role: 'user' | 'assistant', content: string, i: number): ChatMessage {
  return { id: `m${i}`, sessionId: 's1', role, content, createdAt: i * 1000 };
}

describe('buildPrompt', () => {
  it('returns message as-is when no history', () => {
    expect(buildPrompt([], 'Hello')).toBe('Hello');
  });

  it('formats history with Human/Assistant prefixes', () => {
    const history = [
      msg('user', 'Hi', 1),
      msg('assistant', 'Hello!', 2),
    ];
    const result = buildPrompt(history, 'How are you?');
    expect(result).toContain('Human: Hi');
    expect(result).toContain('Assistant: Hello!');
    expect(result).toContain('Human: How are you?');
  });

  it('truncates very long history', () => {
    // Create 50 messages with long content
    const history: ChatMessage[] = [];
    for (let i = 0; i < 50; i++) {
      history.push(msg(i % 2 === 0 ? 'user' : 'assistant', 'x'.repeat(3000), i));
    }
    const result = buildPrompt(history, 'Latest');
    expect(result).toContain('[Earlier conversation omitted');
    expect(result).toContain('Human: Latest');
  });

  it('keeps all messages when history is short', () => {
    const history = [msg('user', 'short', 1)];
    const result = buildPrompt(history, 'next');
    expect(result).not.toContain('omitted');
  });
});
