import { createLogger } from '@gsolut/logger';
import type { AlertNotification, OpportunitySetup, RiskAssessment } from '@gsolut/types';
import { formatTelegramAlertHtml } from './formatter.js';

const logger = createLogger('TelegramDispatcher');

export interface TelegramDispatcherOptions {
  botToken?: string;
  chatId?: string;
  fetchFn?: typeof fetch;
}

export class TelegramDispatcher {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: TelegramDispatcherOptions = {}) {
    this.botToken = options.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? '';
    this.chatId = options.chatId ?? process.env.TELEGRAM_CHAT_ID ?? '';
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  public isConfigured(): boolean {
    return Boolean(this.botToken && this.chatId);
  }

  public async dispatchAlert(
    setup: OpportunitySetup,
    risk: RiskAssessment,
  ): Promise<AlertNotification> {
    const alertId = `alert-${setup.id}-${Date.now()}`;
    const notification: AlertNotification = {
      id: alertId,
      setup,
      risk,
      status: 'PENDING',
      channel: 'TELEGRAM',
    };

    if (!this.isConfigured()) {
      logger.warn(
        `Telegram not configured (missing botToken or chatId). Skipping alert for ${setup.symbol}.`,
      );
      notification.status = 'FAILED';
      notification.errorMessage = 'Telegram credentials not configured';
      return notification;
    }

    const messageHtml = formatTelegramAlertHtml(setup, risk);
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: messageHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Telegram API responded with ${response.status}: ${errorText}`);
      }

      notification.status = 'DISPATCHED';
      notification.dispatchedAt = Date.now();
      logger.info(`Dispatched Telegram alert for ${setup.symbol} [${setup.timeFrame}]`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to dispatch Telegram alert for ${setup.symbol}: ${errorMsg}`);
      notification.status = 'FAILED';
      notification.errorMessage = errorMsg;
    }

    return notification;
  }
}
