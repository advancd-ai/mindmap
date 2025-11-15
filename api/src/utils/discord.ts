import { setTimeout as sleep } from 'timers/promises';

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

const DEFAULT_TIMEOUT_MS = 5000;

export async function sendDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }
  } catch (error) {
    // Discord tends to rate limit aggressively. Add a tiny backoff and retry once.
    console.error('❌ Discord webhook error:', error);
    await sleep(300);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

