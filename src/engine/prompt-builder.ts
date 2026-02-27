import type { ChatMessage } from '../types.js';

/**
 * Build a prompt string from conversation history + new message.
 * Formats as a simple conversation log for Claude CLI --print mode.
 */
export function buildPrompt(history: ChatMessage[], newMessage: string): string {
  if (history.length === 0) return newMessage;

  const lines: string[] = [];
  for (const msg of history) {
    const prefix = msg.role === 'user' ? 'Human' : 'Assistant';
    lines.push(`${prefix}: ${msg.content}`);
  }
  lines.push(`Human: ${newMessage}`);

  return lines.join('\n\n');
}
