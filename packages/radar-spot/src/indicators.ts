import type { Candle } from '@gsolut/types';

/**
 * Computes Simple Moving Average (SMA) over an array of numbers.
 * Elements before period - 1 will be NaN.
 */
export function calculateSMA(values: number[], period: number): number[] {
  if (period <= 0 || values.length === 0) return [];
  const result: number[] = new Array(values.length).fill(Number.NaN);

  let windowSum = 0;
  for (let i = 0; i < values.length; i++) {
    const val = values[i] ?? 0;
    windowSum += val;

    if (i >= period) {
      windowSum -= values[i - period] ?? 0;
    }

    if (i >= period - 1) {
      result[i] = windowSum / period;
    }
  }

  return result;
}

/**
 * Computes Wilder's Smoothed Relative Strength Index (RSI).
 * Returns array of same length as closes; indices < period will be NaN.
 */
export function calculateRSI(closes: number[], period = 14): number[] {
  if (period <= 0 || closes.length <= period) {
    return new Array(closes.length).fill(Number.NaN);
  }

  const result: number[] = new Array(closes.length).fill(Number.NaN);
  let gainsSum = 0;
  let lossesSum = 0;

  // First period changes
  for (let i = 1; i <= period; i++) {
    const change = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    if (change > 0) gainsSum += change;
    else lossesSum += Math.abs(change);
  }

  let avgGain = gainsSum / period;
  let avgLoss = lossesSum / period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  // Wilder's exponential smoothing for subsequent periods
  for (let i = period + 1; i < closes.length; i++) {
    const change = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

export interface WickAnalysis {
  range: number;
  body: number;
  lowerWick: number;
  upperWick: number;
  lowerWickRatio: number;
  upperWickRatio: number;
  bodyRatio: number;
  isBullish: boolean;
}

/**
 * Analyzes candle wicks and body distribution.
 */
export function analyzeCandleWick(candle: Candle): WickAnalysis {
  const range = candle.high - candle.low;
  if (range <= 0) {
    return {
      range: 0,
      body: 0,
      lowerWick: 0,
      upperWick: 0,
      lowerWickRatio: 0,
      upperWickRatio: 0,
      bodyRatio: 0,
      isBullish: candle.close >= candle.open,
    };
  }

  const body = Math.abs(candle.close - candle.open);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);

  return {
    range,
    body,
    lowerWick,
    upperWick,
    lowerWickRatio: Math.max(0, lowerWick / range),
    upperWickRatio: Math.max(0, upperWick / range),
    bodyRatio: Math.max(0, body / range),
    isBullish: candle.close >= candle.open,
  };
}
