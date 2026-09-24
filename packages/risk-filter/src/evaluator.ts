import type { OpportunitySetup, RiskAssessment, RiskLevel, Ticker24h } from '@gsolut/types';

export interface RiskEvaluationOptions {
  minQuoteVolumeUsd?: number;
  maxRiskDistancePercent?: number;
  minRiskDistancePercent?: number;
}

export function evaluateRisk(
  setup: OpportunitySetup,
  ticker: Ticker24h,
  options: RiskEvaluationOptions = {},
): RiskAssessment {
  const minQuoteVolumeUsd = options.minQuoteVolumeUsd ?? 2_000_000;
  const maxRiskDistancePercent = options.maxRiskDistancePercent ?? 6.0;
  const minRiskDistancePercent = options.minRiskDistancePercent ?? 0.5;

  const reasons: string[] = [];
  let level: RiskLevel = 'MEDIUM';
  let score = 50;
  const isTradable = true;

  const riskDistance = setup.currentPrice - setup.invalidationPrice;
  const riskDistancePercent = (riskDistance / setup.currentPrice) * 100;

  // 1. Extreme Trash / Illiquidity Filter
  if (ticker.quoteVolume24h < minQuoteVolumeUsd) {
    return {
      level: 'REJECTED',
      score: 100,
      isTradable: false,
      reasons: [
        `Insufficient 24h quote volume ($${(ticker.quoteVolume24h / 1_000_000).toFixed(2)}M < $${(minQuoteVolumeUsd / 1_000_000).toFixed(2)}M)`,
      ],
      evaluatedAt: Date.now(),
    };
  }

  // 2. Excessively wide invalidation check
  if (riskDistancePercent > maxRiskDistancePercent) {
    return {
      level: 'REJECTED',
      score: 95,
      isTradable: false,
      reasons: [
        `Invalidation distance too wide (${riskDistancePercent.toFixed(1)}% > ${maxRiskDistancePercent}%) for tactical rebound`,
      ],
      evaluatedAt: Date.now(),
    };
  }

  // 3. Excessively tight stop check (high noise risk)
  if (riskDistancePercent < minRiskDistancePercent) {
    reasons.push(
      `Invalidation distance extremely tight (${riskDistancePercent.toFixed(2)}% < ${minRiskDistancePercent}%), high risk of wick stop-out`,
    );
    level = 'HIGH';
    score = 75;
  }

  // 4. Liquidity & Risk Tiering
  if (ticker.quoteVolume24h >= 50_000_000 && riskDistancePercent <= 3.0 && level !== 'HIGH') {
    level = 'LOW';
    score = 25;
    reasons.push(
      `High liquidity pair ($${(ticker.quoteVolume24h / 1_000_000).toFixed(1)}M 24h volume)`,
    );
    reasons.push(`Controlled risk distance (${riskDistancePercent.toFixed(1)}%)`);
  } else if (
    ticker.quoteVolume24h >= 10_000_000 &&
    riskDistancePercent <= 4.5 &&
    level !== 'HIGH'
  ) {
    level = 'MEDIUM';
    score = 50;
    reasons.push(
      `Moderate liquidity ($${(ticker.quoteVolume24h / 1_000_000).toFixed(1)}M 24h volume)`,
    );
    reasons.push(`Standard tactical risk distance (${riskDistancePercent.toFixed(1)}%)`);
  } else {
    level = 'HIGH';
    score = 75;
    reasons.push(
      `Higher volatility / lower liquidity profile ($${(ticker.quoteVolume24h / 1_000_000).toFixed(1)}M volume)`,
    );
  }

  if (setup.riskRewardRatio >= 3.0) {
    reasons.push(`Favorable R:R profile (${setup.riskRewardRatio}:1)`);
    score = Math.max(10, score - 10);
  }

  return {
    level,
    score,
    isTradable,
    reasons,
    evaluatedAt: Date.now(),
  };
}
