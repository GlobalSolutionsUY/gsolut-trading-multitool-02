import assert from 'node:assert/strict';
import test from 'node:test';
import type { Candle } from '@gsolut/types';
import { analyzeCandleWick, calculateRSI, calculateSMA } from '../src/indicators.js';

test('indicators -> calculateSMA calculates moving average correctly', () => {
  const values = [10, 20, 30, 40, 50];
  const sma3 = calculateSMA(values, 3);

  assert.equal(sma3.length, 5);
  assert.ok(Number.isNaN(sma3[0]));
  assert.ok(Number.isNaN(sma3[1]));
  assert.equal(sma3[2], 20); // (10+20+30)/3
  assert.equal(sma3[3], 30); // (20+30+40)/3
  assert.equal(sma3[4], 40); // (30+40+50)/3
});

test('indicators -> calculateRSI computes oversold on sustained drop', () => {
  // 15 days of consecutive drops
  const closes = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25];
  const rsi = calculateRSI(closes, 14);

  assert.equal(rsi.length, closes.length);
  assert.ok(Number.isNaN(rsi[0]));
  assert.ok(Number.isNaN(rsi[13]));

  const rsi14 = rsi[14];
  assert.ok(rsi14 !== undefined);
  // Pure drop means 0 gains, RS = 0, RSI = 0
  assert.equal(rsi14, 0);

  const rsi15 = rsi[15];
  assert.ok(rsi15 !== undefined);
  assert.equal(rsi15, 0);
});

test('indicators -> calculateRSI computes overbought on sustained rally', () => {
  const closes = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85];
  const rsi = calculateRSI(closes, 14);

  const rsi14 = rsi[14];
  assert.ok(rsi14 !== undefined);
  // Pure rally means 0 losses, RSI = 100
  assert.equal(rsi14, 100);
});

test('indicators -> analyzeCandleWick detects lower rejection shadow', () => {
  const hammer: Candle = {
    openTime: 1000,
    open: 102,
    high: 105,
    low: 90, // big lower shadow (100 - 90 = 10 out of 15 range)
    close: 104,
    volume: 1000,
    closeTime: 1999,
    quoteVolume: 104000,
  };

  const analysis = analyzeCandleWick(hammer);
  assert.equal(analysis.range, 15);
  assert.equal(analysis.body, 2);
  assert.equal(analysis.lowerWick, 12); // min(102, 104) - 90 = 12
  assert.equal(analysis.upperWick, 1); // 105 - max(102, 104) = 1
  assert.equal(Math.round(analysis.lowerWickRatio * 100), 80); // 12/15 = 80%
  assert.equal(analysis.isBullish, true);
});
