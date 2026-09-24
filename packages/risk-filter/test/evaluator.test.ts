import assert from 'node:assert/strict';
import test from 'node:test';
import type { OpportunitySetup, Ticker24h } from '@gsolut/types';
import { evaluateRisk } from '../src/evaluator.js';

const baseSetup: OpportunitySetup = {
  id: 'BTCUSDT-15m-1',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  pattern: 'SPOT_TACTICAL_REBOUND',
  timeFrame: '15m',
  currentPrice: 60000,
  entryZone: { min: 59800, max: 60200 },
  target: { price: 63000, percentage: 5.0 },
  invalidationPrice: 59000, // 1.67% risk distance
  riskRewardRatio: 3.0,
  reasons: ['RSI oversold', 'Volume spike'],
  detectedAt: Date.now(),
};

test('risk evaluator -> REJECTED when volume is below minimum', () => {
  const lowVolTicker: Ticker24h = {
    symbol: 'JUNKUSDT',
    lastPrice: 10,
    priceChangePercent: -20,
    volume24h: 1000,
    quoteVolume24h: 500_000, // < $2M
    highPrice24h: 15,
    lowPrice24h: 9,
  };

  const assessment = evaluateRisk(baseSetup, lowVolTicker);
  assert.equal(assessment.level, 'REJECTED');
  assert.equal(assessment.isTradable, false);
});

test('risk evaluator -> LOW risk on deep liquidity with tight stop', () => {
  const highVolTicker: Ticker24h = {
    symbol: 'BTCUSDT',
    lastPrice: 60000,
    priceChangePercent: -3,
    volume24h: 5000,
    quoteVolume24h: 300_000_000, // $300M
    highPrice24h: 62000,
    lowPrice24h: 59000,
  };

  const assessment = evaluateRisk(baseSetup, highVolTicker);
  assert.equal(assessment.level, 'LOW');
  assert.equal(assessment.isTradable, true);
  assert.ok(assessment.score <= 30);
});

test('risk evaluator -> REJECTED when invalidation distance is excessively wide', () => {
  const wideStopSetup: OpportunitySetup = {
    ...baseSetup,
    invalidationPrice: 54000, // 10% risk distance (> 6%)
  };

  const ticker: Ticker24h = {
    symbol: 'BTCUSDT',
    lastPrice: 60000,
    priceChangePercent: -10,
    volume24h: 5000,
    quoteVolume24h: 50_000_000,
    highPrice24h: 67000,
    lowPrice24h: 54000,
  };

  const assessment = evaluateRisk(wideStopSetup, ticker);
  assert.equal(assessment.level, 'REJECTED');
  assert.equal(assessment.isTradable, false);
});
