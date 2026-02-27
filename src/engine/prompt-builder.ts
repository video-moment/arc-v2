import type { ChatMessage } from '../types.js';

const MAX_HISTORY_CHARS = 80_000; // ~20K tokens, safe margin for Claude
const MAX_HISTORY_MESSAGES = 40;  // Keep last N messages max

/**
 * Build a prompt string from conversation history + new message.
 * Truncates old messages to stay within token limits.
 */
export function buildPrompt(history: ChatMessage[], newMessage: string): string {
  if (history.length === 0) return newMessage;

  // Take most recent messages, within limits
  let selected = history.slice(-MAX_HISTORY_MESSAGES);

  // Trim by character count (rough token proxy)
  let totalChars = 0;
  const trimmed: ChatMessage[] = [];
  for (let i = selected.length - 1; i >= 0; i--) {
    totalChars += selected[i].content.length;
    if (totalChars > MAX_HISTORY_CHARS) break;
    trimmed.unshift(selected[i]);
  }

  const lines: string[] = [];

  // Add truncation notice if history was trimmed
  if (trimmed.length < history.length) {
    lines.push(`[Earlier conversation omitted — ${history.length - trimmed.length} messages]`);
  }

  for (const msg of trimmed) {
    const prefix = msg.role === 'user' ? 'Human' : 'Assistant';
    lines.push(`${prefix}: ${msg.content}`);
  }
  lines.push(`Human: ${newMessage}`);

  return lines.join('\n\n');
}
