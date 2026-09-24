import assert from 'node:assert/strict';
import test from 'node:test';
import { BinanceConnector } from '@gsolut/connector-binance';
import { createApp } from '../src/app.js';
import type { StablecoinItem } from '../src/routes/market.js';

test('GET /api/market/stables returns stablecoin list with prices and peg deviations', async () => {
  const mockTickers: Record<
    string,
    {
      lastPrice: string;
      volume: string;
      quoteVolume: string;
      highPrice: string;
      lowPrice: string;
      priceChangePercent: string;
    }
  > = {
    USDCUSDT: {
      lastPrice: '0.9998',
      volume: '50000000',
      quoteVolume: '49990000',
      highPrice: '1.0005',
      lowPrice: '0.9995',
      priceChangePercent: '-0.02',
    },
    FDUSDUSDT: {
      lastPrice: '1.0002',
      volume: '80000000',
      quoteVolume: '80016000',
      highPrice: '1.0006',
      lowPrice: '0.9998',
      priceChangePercent: '0.01',
    },
  };

  const mockFetch: typeof fetch = async (input) => {
    const url = input.toString();
    for (const [symbol, data] of Object.entries(mockTickers)) {
      if (url.includes(`symbol=${symbol}`)) {
        return new Response(JSON.stringify({ symbol, ...data }), { status: 200 });
      }
    }
    return new Response('Not found', { status: 404 });
  };

  const connector = new BinanceConnector({ fetchFn: mockFetch });
  const app = createApp({
    connector,
    stables: [
      { symbol: 'USDCUSDT', name: 'USD Coin', pegTarget: 1.0 },
      { symbol: 'FDUSDUSDT', name: 'First Digital USD', pegTarget: 1.0 },
    ],
  });

  const res = await app.request('/api/market/stables');
  assert.equal(res.status, 200);

  const data = (await res.json()) as { totalCount: number; items: StablecoinItem[] };
  assert.equal(data.totalCount, 2);
  assert.equal(data.items[0]?.symbol, 'USDCUSDT');
  assert.equal(data.items[0]?.price, 0.9998);
  assert.equal(data.items[0]?.deviationPercent, -0.02);
  assert.equal(data.items[0]?.isPegged, true);
  assert.equal(data.items[1]?.symbol, 'FDUSDUSDT');
  assert.equal(data.items[1]?.price, 1.0002);
  assert.equal(data.items[1]?.deviationPercent, 0.02);
  assert.equal(data.items[1]?.isPegged, true);
});
