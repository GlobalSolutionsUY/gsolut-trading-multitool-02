import { createLogger } from '@gsolut/logger';
import type { Candle, ExchangeConnector, Ticker24h, TimeFrame } from '@gsolut/types';

const logger = createLogger('BinanceConnector');

export interface BinanceConnectorOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

interface RawBinanceTicker24h {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

type RawBinanceKline = [
  number, // 0: Open time
  string, // 1: Open
  string, // 2: High
  string, // 3: Low
  string, // 4: Close
  string, // 5: Volume
  number, // 6: Close time
  string, // 7: Quote asset volume
  number, // 8: Number of trades
  string, // 9: Taker buy base asset volume
  string, // 10: Taker buy quote asset volume
  string, // 11: Ignore
];

export class BinanceConnector implements ExchangeConnector {
  public readonly exchangeId = 'binance';
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: BinanceConnectorOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://api.binance.com').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  private async request<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'gsolut-trading-multitool/0.1.0',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `Binance API error: ${response.status} ${response.statusText} (${errorBody})`,
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Binance request to ${endpoint} timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  public async getTopTickers(minQuoteVolumeUsd = 2_000_000): Promise<Ticker24h[]> {
    logger.debug(`Fetching 24h tickers (min quote volume: $${minQuoteVolumeUsd.toLocaleString()})`);
    const rawTickers = await this.request<RawBinanceTicker24h[]>('/api/v3/ticker/24hr');

    if (!Array.isArray(rawTickers)) {
      throw new Error('Unexpected Binance response: expected array of 24h tickers');
    }

    const mapped: Ticker24h[] = [];

    for (const t of rawTickers) {
      // Focus on liquid USDT spot trading pairs
      if (!t.symbol.endsWith('USDT')) continue;

      const quoteVolume24h = Number.parseFloat(t.quoteVolume);
      if (Number.isNaN(quoteVolume24h) || quoteVolume24h < minQuoteVolumeUsd) continue;

      mapped.push({
        symbol: t.symbol,
        lastPrice: Number.parseFloat(t.lastPrice),
        priceChangePercent: Number.parseFloat(t.priceChangePercent),
        volume24h: Number.parseFloat(t.volume),
        quoteVolume24h,
        highPrice24h: Number.parseFloat(t.highPrice),
        lowPrice24h: Number.parseFloat(t.lowPrice),
      });
    }

    // Sort descending by 24h quote volume
    return mapped.sort((a, b) => b.quoteVolume24h - a.quoteVolume24h);
  }

  public async getTicker(symbol: string): Promise<Ticker24h> {
    const raw = await this.request<RawBinanceTicker24h>('/api/v3/ticker/24hr', { symbol });

    return {
      symbol: raw.symbol,
      lastPrice: Number.parseFloat(raw.lastPrice),
      priceChangePercent: Number.parseFloat(raw.priceChangePercent),
      volume24h: Number.parseFloat(raw.volume),
      quoteVolume24h: Number.parseFloat(raw.quoteVolume),
      highPrice24h: Number.parseFloat(raw.highPrice),
      lowPrice24h: Number.parseFloat(raw.lowPrice),
    };
  }

  public async getCandles(symbol: string, interval: TimeFrame, limit = 100): Promise<Candle[]> {
    logger.debug(`Fetching candles for ${symbol} interval=${interval} limit=${limit}`);
    const rawKlines = await this.request<RawBinanceKline[]>('/api/v3/klines', {
      symbol,
      interval,
      limit,
    });

    if (!Array.isArray(rawKlines)) {
      throw new Error(`Unexpected Binance response: expected array of klines for ${symbol}`);
    }

    return rawKlines.map((k) => ({
      openTime: k[0],
      open: Number.parseFloat(k[1]),
      high: Number.parseFloat(k[2]),
      low: Number.parseFloat(k[3]),
      close: Number.parseFloat(k[4]),
      volume: Number.parseFloat(k[5]),
      closeTime: k[6],
      quoteVolume: Number.parseFloat(k[7]),
      tradesCount: k[8],
    }));
  }
}
