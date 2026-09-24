import assert from 'node:assert/strict';
import test from 'node:test';
import type { OpportunitySetup, RiskAssessment } from '@gsolut/types';
import { formatTelegramAlertHtml } from '../src/formatter.js';

test('formatter -> formats HTML message with setup and risk details', () => {
  const setup: OpportunitySetup = {
    id: 'SOLUSDT-15m-1727170000',
    symbol: 'SOLUSDT',
    exchange: 'binance',
    pattern: 'SPOT_TACTICAL_REBOUND',
    timeFrame: '15m',
    currentPrice: 132.5,
    entryZone: { min: 131.8, max: 132.8 },
    target: { price: 139.5, percentage: 5.3 },
    invalidationPrice: 129.8,
    riskRewardRatio: 2.6,
    reasons: ['RSI(14) oversold at 26.4', 'Volume spike 2.8x SMA(20)'],
    detectedAt: Date.now(),
  };

  const risk: RiskAssessment = {
    level: 'LOW',
    score: 25,
    isTradable: true,
    reasons: ['High liquidity pair ($45M)', 'Controlled risk distance (2.0%)'],
    evaluatedAt: Date.now(),
  };

  const html = formatTelegramAlertHtml(setup, risk);

  assert.ok(html.includes('SOLUSDT'));
  assert.ok(html.includes('132.5'));
  assert.ok(html.includes('139.5'));
  assert.ok(html.includes('129.8'));
  assert.ok(html.includes('LOW'));
  assert.ok(html.includes('RSI(14) oversold at 26.4'));
  assert.ok(html.includes('Ger & Freya'));
});
