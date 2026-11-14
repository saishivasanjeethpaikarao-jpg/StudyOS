// StudyOS Telegram Local Development Poller
// Forwards updates from Telegram getUpdates to local webhook for testing
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  console.error('[Telegram Poller] ERROR: TELEGRAM_BOT_TOKEN environment variable is missing.');
  process.exit(1);
}

if (!webhookSecret) {
  console.error('[Telegram Poller] ERROR: TELEGRAM_WEBHOOK_SECRET environment variable is missing.');
  process.exit(1);
}

const localWebhook = 'http://localhost:3001/integrations/telegram/webhook';
let offset = 0;

console.log('[Telegram Poller] Starting polling for @Study_OSbot...');

async function poll() {
  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=15`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          console.log(`[Telegram Poller] Received update ${update.update_id} from ${update.message?.from?.username || update.message?.from?.id}: ${update.message?.text}`);
          try {
            const hookRes = await fetch(localWebhook, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-telegram-bot-api-secret-token': webhookSecret,
              },
              body: JSON.stringify(update),
            });
            const hookData = await hookRes.json();
            console.log(`[Telegram Poller] Webhook processed:`, hookData);
          } catch (err) {
            console.error('[Telegram Poller] Failed to forward to local webhook:', err.message);
          }
        }
      }
    } catch (err) {
      console.error('[Telegram Poller] Polling error:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

poll();
