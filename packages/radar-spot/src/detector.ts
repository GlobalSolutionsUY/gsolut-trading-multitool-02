import type { Candle, OpportunitySetup, Ticker24h, TimeFrame } from '@gsolut/types';
import { analyzeCandleWick, calculateRSI, calculateSMA } from './indicators.js';

export interface SpotDetectionOptions {
  timeFrame?: TimeFrame;
  minQuoteVolumeUsd?: number;
  maxRsi?: number;
  minVolumeAnomalyMultiplier?: number;
  minLowerWickRatio?: number;
  minRiskRewardRatio?: number;
}

export function detectSpotOpportunity(
  symbol: string,
  candles: Candle[],
  ticker: Ticker24h,
  options: SpotDetectionOptions = {},
): OpportunitySetup | null {
  const timeFrame = options.timeFrame ?? '15m';
  const minQuoteVolumeUsd = options.minQuoteVolumeUsd ?? 2_000_000;
  const maxRsi = options.maxRsi ?? 32;
  const minVolumeAnomalyMultiplier = options.minVolumeAnomalyMultiplier ?? 2.0;
  const minLowerWickRatio = options.minLowerWickRatio ?? 0.45;
  const minRiskRewardRatio = options.minRiskRewardRatio ?? 2.0;

  // Need sufficient candles for RSI(14) and SMA(20)
  if (candles.length < 25) return null;

  // Filter out low-liquidity pairs
  if (ticker.quoteVolume24h < minQuoteVolumeUsd) return null;

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const rsiSeries = calculateRSI(closes, 14);
  const volumeSmaSeries = calculateSMA(volumes, 20);

  const lastCandle = candles[candles.length - 1];
  const currentRsi = rsiSeries[rsiSeries.length - 1];
  const currentVolumeSma = volumeSmaSeries[volumeSmaSeries.length - 1];

  if (!lastCandle || currentRsi === undefined || currentVolumeSma === undefined) {
    return null;
  }

  // 1. Oversold momentum condition
  if (Number.isNaN(currentRsi) || currentRsi > maxRsi) {
    return null;
  }

  // 2. Volume anomaly (absorption) condition
  if (Number.isNaN(currentVolumeSma) || currentVolumeSma <= 0) {
    return null;
  }
  const volumeMultiplier = lastCandle.volume / currentVolumeSma;
  if (volumeMultiplier < minVolumeAnomalyMultiplier) {
    return null;
  }

  // 3. Rejection wick / absorption hammer condition
  const wick = analyzeCandleWick(lastCandle);
  if (wick.lowerWickRatio < minLowerWickRatio) {
    return null;
  }

  const currentPrice = lastCandle.close;
  // Invalidation: 0.4% below the rejection wick low
  const invalidationPrice = Math.round(lastCandle.low * 0.996 * 10000) / 10000;

  if (currentPrice <= invalidationPrice) {
    return null;
  }

  const riskDistance = currentPrice - invalidationPrice;
  // Tactical rebound target (aiming for 2.2x to 3.0x risk, min +3.5%)
  const rawTarget = Math.max(currentPrice * 1.035, currentPrice + riskDistance * 2.2);
  const targetPrice = Math.round(rawTarget * 10000) / 10000;
  const rewardDistance = targetPrice - currentPrice;
  const calculatedRR = Math.round((rewardDistance / riskDistance) * 10) / 10;

  if (calculatedRR < minRiskRewardRatio) {
    return null;
  }

  const entryMin =
    Math.round(
      Math.min(lastCandle.low + (currentPrice - lastCandle.low) * 0.3, currentPrice * 0.998) *
        10000,
    ) / 10000;
  const entryMax = Math.round(currentPrice * 1.002 * 10000) / 10000;

  const targetPercentage = Math.round(((targetPrice - currentPrice) / currentPrice) * 1000) / 10;

  const reasons = [
    `RSI(14) oversold at ${currentRsi.toFixed(1)}`,
    `Volume spike ${volumeMultiplier.toFixed(1)}x over 20-SMA`,
    `Absorption wick ${(wick.lowerWickRatio * 100).toFixed(0)}% of candle range`,
    `24h quote volume: $${(ticker.quoteVolume24h / 1_000_000).toFixed(1)}M`,
  ];

  return {
    id: `${symbol}-${timeFrame}-${lastCandle.openTime}`,
    symbol,
    exchange: 'binance',
    pattern: 'SPOT_TACTICAL_REBOUND',
    timeFrame,
    currentPrice,
    entryZone: {
      min: entryMin,
      max: entryMax,
    },
    target: {
      price: targetPrice,
      percentage: targetPercentage,
    },
    invalidationPrice,
    riskRewardRatio: calculatedRR,
    reasons,
    detectedAt: Date.now(),
  };
}
