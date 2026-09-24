import assert from 'node:assert/strict';
import test from 'node:test';
import type { Candle, Ticker24h } from '@gsolut/types';
import { detectSpotOpportunity } from '../src/detector.js';

function generateCandles(count: number, basePrice: number, downtrend = true): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();
  const interval = 15 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * interval;
    const change = downtrend ? -2 : 1;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + 1;
    const low = Math.min(open, close) - 1;
    const volume = 100; // Baseline volume

    candles.push({
      openTime: time,
      open,
      high,
      low,
      close,
      volume,
      closeTime: time + interval - 1,
      quoteVolume: volume * close,
    });

    price = close;
  }

  return candles;
}

test('detector -> returns null when 24h volume is below minimum', () => {
  const candles = generateCandles(30, 100, true);
  const ticker: Ticker24h = {
    symbol: 'MICROUSDT',
    lastPrice: 40,
    priceChangePercent: -15,
    volume24h: 1000,
    quoteVolume24h: 500_000, // < $2M
    highPrice24h: 100,
    lowPrice24h: 38,
  };

  const setup = detectSpotOpportunity('MICROUSDT', candles, ticker, {
    minQuoteVolumeUsd: 2_000_000,
  });

  assert.equal(setup, null);
});

test('detector -> returns null when RSI is not oversold', () => {
  // Uptrend gives high RSI
  const candles = generateCandles(30, 50, false);
  const ticker: Ticker24h = {
    symbol: 'BTCUSDT',
    lastPrice: 80,
    priceChangePercent: 5,
    volume24h: 1000,
    quoteVolume24h: 80_000_000,
    highPrice24h: 85,
    lowPrice24h: 48,
  };

  const setup = detectSpotOpportunity('BTCUSDT', candles, ticker);
  assert.equal(setup, null);
});

test('detector -> detects tactical rebound when oversold, volume anomaly, and hammer wick occur', () => {
  // 29 candles of steady decline -> RSI very low
  const candles = generateCandles(29, 100, true);

  // 30th candle: Massive volume spike + huge rejection wick (bullish hammer)
  const lastTime = Date.now();
  const hammerCandle: Candle = {
    openTime: lastTime,
    open: 42,
    high: 44,
    low: 30, // 14 range, lower wick is 42 - 30 = 12 (85% lower wick)
    close: 43.5,
    volume: 350, // 3.5x over baseline volume of 100
    closeTime: lastTime + 900000,
    quoteVolume: 350 * 43.5,
  };
  candles.push(hammerCandle);

  const ticker: Ticker24h = {
    symbol: 'SOLUSDT',
    lastPrice: 43.5,
    priceChangePercent: -25,
    volume24h: 500_000,
    quoteVolume24h: 25_000_000, // $25M
    highPrice24h: 100,
    lowPrice24h: 30,
  };

  const setup = detectSpotOpportunity('SOLUSDT', candles, ticker, {
    minQuoteVolumeUsd: 2_000_000,
    maxRsi: 35,
    minVolumeAnomalyMultiplier: 2.0,
    minLowerWickRatio: 0.45,
  });

  assert.ok(setup !== null);
  assert.equal(setup.symbol, 'SOLUSDT');
  assert.equal(setup.pattern, 'SPOT_TACTICAL_REBOUND');
  assert.equal(setup.currentPrice, 43.5);
  assert.ok(setup.invalidationPrice < 30);
  assert.ok(setup.target.price > 43.5);
  assert.ok(setup.riskRewardRatio >= 2.0);
  assert.ok(setup.reasons.length >= 3);
});
