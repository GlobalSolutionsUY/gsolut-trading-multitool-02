import assert from 'node:assert/strict';
import test from 'node:test';
import { TelegramDispatcher } from '@gsolut/alerter-telegram';
import type { BinanceConnector } from '@gsolut/connector-binance';
import { RadarStateStore } from '@gsolut/radar-spot';
import type { Candle, Ticker24h } from '@gsolut/types';
import { SpotScanner } from '../src/scanner.js';

test('SpotScanner -> executes scan cycle and populates store', async () => {
  const store = new RadarStateStore();

  const mockTickers: Ticker24h[] = [
    {
      symbol: 'BTCUSDT',
      lastPrice: 64000,
      priceChangePercent: -2,
      volume24h: 1500,
      quoteVolume24h: 96_000_000,
      highPrice24h: 65000,
      lowPrice24h: 63000,
    },
  ];

  // 30 candles ending in a bullish hammer with high volume
  const now = Date.now();
  const mockCandles: Candle[] = Array.from({ length: 29 }, (_, i) => ({
    openTime: now - (30 - i) * 900000,
    open: 65000 - i * 30,
    high: 65050 - i * 30,
    low: 64950 - i * 30,
    close: 64970 - i * 30,
    volume: 100,
    closeTime: now - (30 - i) * 900000 + 899999,
    quoteVolume: 100 * 64970,
  }));

  // Rejection hammer
  mockCandles.push({
    openTime: now - 900000,
    open: 64100,
    high: 64200,
    low: 63000, // 1200 range, lower wick 1100 (91%)
    close: 64150,
    volume: 500, // 5x volume
    closeTime: now - 1,
    quoteVolume: 500 * 64150,
  });

  const mockConnector = {
    exchangeId: 'binance',
    async getTopTickers() {
      return mockTickers;
    },
    async getCandles() {
      return mockCandles;
    },
    async getTicker(symbol: string) {
      return mockTickers.find((t) => t.symbol === symbol)!;
    },
  } as unknown as BinanceConnector;

  const mockAlerter = new TelegramDispatcher({
    botToken: '',
    chatId: '',
  });

  const scanner = new SpotScanner({
    connector: mockConnector,
    store,
    alerter: mockAlerter,
    minQuoteVolumeUsd: 2_000_000,
    maxPairsToScan: 5,
  });

  const result = await scanner.runScanCycle();

  assert.equal(result.scanned, 1);
  assert.equal(result.detected, 1);
  assert.equal(store.getActiveOpportunities().length, 1);
  assert.equal(store.getActiveOpportunities()[0]?.symbol, 'BTCUSDT');
});
