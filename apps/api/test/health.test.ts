import assert from 'node:assert/strict';
import test from 'node:test';
import { app } from '../src/app.js';

test('GET /health returns status ok', async () => {
  const res = await app.request('/health');
  assert.equal(res.status, 200);

  const data = (await res.json()) as { status: string; uptime: number; timestamp: string };
  assert.equal(data.status, 'ok');
  assert.equal(typeof data.uptime, 'number');
  assert.ok(data.timestamp);
});

test('GET /api/status returns service metadata', async () => {
  const res = await app.request('/api/status');
  assert.equal(res.status, 200);

  const data = (await res.json()) as {
    service: string;
    version: string;
    activeProvider: string;
  };
  assert.equal(data.service, 'trading-multitool-api');
  assert.equal(data.activeProvider, 'binance');
});

test('GET /api/test-candles returns synthetic candle sequence', async () => {
  const res = await app.request('/api/test-candles');
  assert.equal(res.status, 200);

  const data = (await res.json()) as { symbol: string; candles: unknown[] };
  assert.equal(data.symbol, 'BTCUSDT');
  assert.equal(data.candles.length, 30);
});
