const TELEGRAM_API = 'https://api.telegram.org';

export interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name: string; username?: string };
  chat: { id: number; type: string; title?: string };
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export class TelegramBot {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async api(method: string, body?: Record<string, unknown>): Promise<any> {
    const url = `${TELEGRAM_API}/bot${this.token}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
    return data.result;
  }

  async sendMessage(chatId: string | number, text: string): Promise<TelegramMessage> {
    return this.api('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
  }

  async getMe(): Promise<{ id: number; first_name: string; username: string }> {
    return this.api('getMe');
  }

  async setWebhook(url: string): Promise<boolean> {
    return this.api('setWebhook', { url });
  }

  async deleteWebhook(): Promise<boolean> {
    return this.api('deleteWebhook');
  }
}
