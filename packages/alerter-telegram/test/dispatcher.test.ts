import assert from 'node:assert/strict';
import test from 'node:test';
import type { OpportunitySetup, RiskAssessment } from '@gsolut/types';
import { TelegramDispatcher } from '../src/dispatcher.js';

const mockSetup: OpportunitySetup = {
  id: 'BTCUSDT-15m-1',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  pattern: 'SPOT_TACTICAL_REBOUND',
  timeFrame: '15m',
  currentPrice: 62000,
  entryZone: { min: 61800, max: 62100 },
  target: { price: 65000, percentage: 4.8 },
  invalidationPrice: 61000,
  riskRewardRatio: 3.0,
  reasons: ['RSI oversold', 'Volume spike'],
  detectedAt: Date.now(),
};

const mockRisk: RiskAssessment = {
  level: 'LOW',
  score: 20,
  isTradable: true,
  reasons: ['Deep liquidity'],
  evaluatedAt: Date.now(),
};

test('TelegramDispatcher -> returns FAILED when credentials not configured', async () => {
  const dispatcher = new TelegramDispatcher({ botToken: '', chatId: '' });
  const result = await dispatcher.dispatchAlert(mockSetup, mockRisk);

  assert.equal(result.status, 'FAILED');
  assert.equal(result.errorMessage, 'Telegram credentials not configured');
});

test('TelegramDispatcher -> dispatches alert successfully via mocked fetch', async () => {
  let calledUrl = '';
  let payload: Record<string, unknown> = {};

  const mockFetch: typeof fetch = async (input, init) => {
    calledUrl = input.toString();
    if (init?.body) {
      payload = JSON.parse(init.body.toString()) as Record<string, unknown>;
    }
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1234 } }), {
      status: 200,
    });
  };

  const dispatcher = new TelegramDispatcher({
    botToken: 'mock-bot-token',
    chatId: 'mock-chat-id',
    fetchFn: mockFetch,
  });

  const result = await dispatcher.dispatchAlert(mockSetup, mockRisk);

  assert.equal(result.status, 'DISPATCHED');
  assert.ok(result.dispatchedAt);
  assert.ok(calledUrl.includes('api.telegram.org/botmock-bot-token/sendMessage'));
  assert.equal(payload.chat_id, 'mock-chat-id');
  assert.equal(payload.parse_mode, 'HTML');
  assert.ok(typeof payload.text === 'string' && payload.text.includes('BTCUSDT'));
});
