import assert from 'node:assert/strict';
import test from 'node:test';
import { BinanceConnector } from '@gsolut/connector-binance';
import { RadarStateStore } from '@gsolut/radar-spot';
import type { OpportunitySetup } from '@gsolut/types';
import { createApp } from '../src/app.js';

test('GET /api/radar/spot/candidates returns active opportunities from store', async () => {
  const store = new RadarStateStore();
  const mockSetup: OpportunitySetup = {
    id: 'ETHUSDT-15m-1',
    symbol: 'ETHUSDT',
    exchange: 'binance',
    pattern: 'SPOT_TACTICAL_REBOUND',
    timeFrame: '15m',
    currentPrice: 3400,
    entryZone: { min: 3380, max: 3410 },
    target: { price: 3580, percentage: 5.3 },
    invalidationPrice: 3330,
    riskRewardRatio: 2.6,
    reasons: ['RSI oversold', 'Volume spike 2.5x'],
    detectedAt: Date.now(),
  };
  store.registerOpportunity(mockSetup);

  const app = createApp({ store });
  const res = await app.request('/api/radar/spot/candidates');

  assert.equal(res.status, 200);
  const data = (await res.json()) as { totalCount: number; candidates: OpportunitySetup[] };
  assert.equal(data.totalCount, 1);
  assert.equal(data.candidates[0]?.symbol, 'ETHUSDT');
});

test('GET /api/radar/spot/snapshot returns full state metadata', async () => {
  const store = new RadarStateStore();
  store.setScanning(false, 25);

  const app = createApp({ store });
  const res = await app.request('/api/radar/spot/snapshot');

  assert.equal(res.status, 200);
  const data = (await res.json()) as { scannedSymbolsCount: number; isScanning: boolean };
  assert.equal(data.scannedSymbolsCount, 25);
  assert.equal(data.isScanning, false);
});

test('POST /api/radar/spot/scan triggers scan cycle using connector', async () => {
  const store = new RadarStateStore();

  const mockFetch: typeof fetch = async (input) => {
    const url = input.toString();
    if (url.includes('/api/v3/ticker/24hr')) {
      return new Response(
        JSON.stringify([
          {
            symbol: 'SOLUSDT',
            lastPrice: '130.00',
            priceChangePercent: '-12.0',
            volume: '500000',
            quoteVolume: '65000000.00',
            highPrice: '145.00',
            lowPrice: '128.00',
          },
        ]),
        { status: 200 },
      );
    }
    if (url.includes('/api/v3/klines')) {
      // Return 30 candles
      const now = Date.now();
      const klines = Array.from({ length: 30 }, (_, i) => [
        now - (30 - i) * 900000,
        '135.00',
        '136.00',
        i === 29 ? '125.00' : '134.00', // Rejection wick on last candle
        '135.50',
        i === 29 ? '5000' : '1000', // Volume anomaly on last candle
        now - (30 - i) * 900000 + 899999,
        '135000.00',
        500,
        '2500',
        '67500.00',
        '0',
      ]);
      return new Response(JSON.stringify(klines), { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  };

  const connector = new BinanceConnector({ fetchFn: mockFetch });
  const app = createApp({ store, connector });

  const res = await app.request('/api/radar/spot/scan', { method: 'POST' });
  assert.equal(res.status, 200);

  const data = (await res.json()) as { success: boolean; scannedPairs: number };
  assert.equal(data.success, true);
  assert.equal(data.scannedPairs, 1);
});
