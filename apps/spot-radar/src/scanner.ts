import { TelegramDispatcher } from '@gsolut/alerter-telegram';
import { BinanceConnector } from '@gsolut/connector-binance';
import { createLogger } from '@gsolut/logger';
import { type RadarStateStore, defaultRadarStore, detectSpotOpportunity } from '@gsolut/radar-spot';
import { evaluateRisk } from '@gsolut/risk-filter';
import type { TimeFrame } from '@gsolut/types';

const logger = createLogger('SpotScanner');

export interface SpotScannerOptions {
  connector?: BinanceConnector;
  store?: RadarStateStore;
  alerter?: TelegramDispatcher;
  minQuoteVolumeUsd?: number;
  maxPairsToScan?: number;
  timeFrame?: TimeFrame;
}

export class SpotScanner {
  private readonly connector: BinanceConnector;
  private readonly store: RadarStateStore;
  private readonly alerter: TelegramDispatcher;
  private readonly minQuoteVolumeUsd: number;
  private readonly maxPairsToScan: number;
  private readonly timeFrame: TimeFrame;

  private alertedSetupIds = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(options: SpotScannerOptions = {}) {
    this.connector = options.connector ?? new BinanceConnector();
    this.store = options.store ?? defaultRadarStore;
    this.alerter = options.alerter ?? new TelegramDispatcher();
    this.minQuoteVolumeUsd = options.minQuoteVolumeUsd ?? 2_000_000;
    this.maxPairsToScan = options.maxPairsToScan ?? 30;
    this.timeFrame = options.timeFrame ?? '15m';
  }

  public async runScanCycle(): Promise<{
    scanned: number;
    detected: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    logger.info(`Starting spot market scan cycle (${this.timeFrame} timeframe)`);
    this.store.setScanning(true);

    let detectedCount = 0;
    let scannedCount = 0;

    try {
      const tickers = await this.connector.getTopTickers(this.minQuoteVolumeUsd);
      const targetTickers = tickers.slice(0, this.maxPairsToScan);
      scannedCount = targetTickers.length;

      logger.debug(`Evaluating ${scannedCount} liquid spot USDT pairs`);

      for (const ticker of targetTickers) {
        try {
          const candles = await this.connector.getCandles(ticker.symbol, this.timeFrame, 50);
          const setup = detectSpotOpportunity(ticker.symbol, candles, ticker, {
            timeFrame: this.timeFrame,
            minQuoteVolumeUsd: this.minQuoteVolumeUsd,
          });

          if (setup) {
            const risk = evaluateRisk(setup, ticker);
            if (risk.isTradable) {
              this.store.registerOpportunity(setup);
              detectedCount++;

              // Dispatch Telegram alert if not alerted previously
              if (!this.alertedSetupIds.has(setup.id)) {
                this.alertedSetupIds.add(setup.id);
                await this.alerter.dispatchAlert(setup, risk);
              }
            }
          }
        } catch (pairErr) {
          logger.warn(`Error scanning pair ${ticker.symbol}: ${pairErr}`);
        }
      }
    } catch (err) {
      logger.error(`Market scan cycle encountered an unhandled error: ${err}`);
    } finally {
      this.store.setScanning(false, scannedCount);
    }

    const durationMs = Date.now() - startTime;
    logger.info(
      `Scan cycle finished: ${scannedCount} pairs scanned, ${detectedCount} setups found (${durationMs}ms)`,
    );

    // Keep alertedSetupIds bounded to 500 items
    if (this.alertedSetupIds.size > 500) {
      const toDelete = Array.from(this.alertedSetupIds).slice(0, 200);
      for (const id of toDelete) this.alertedSetupIds.delete(id);
    }

    return { scanned: scannedCount, detected: detectedCount, durationMs };
  }

  public start(intervalSeconds = 60): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`Starting background scanner daemon (interval: ${intervalSeconds}s)`);

    // Immediate first run
    void this.runScanCycle();

    this.timer = setInterval(() => {
      void this.runScanCycle();
    }, intervalSeconds * 1000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('Stopped background scanner daemon');
  }
}
