/**
 * Canonical Market Data Types
 */

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  tradesCount?: number;
}

export interface Ticker24h {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  volume24h: number;
  quoteVolume24h: number;
  highPrice24h: number;
  lowPrice24h: number;
}

/**
 * Opportunity & Setup Types
 */

export type OpportunityPattern =
  | 'SPOT_TACTICAL_REBOUND'
  | 'OVERSOLD_VOLUME_SPIKE'
  | 'WICK_REJECTION'
  | 'STRUCTURE_RECOVERY';

export interface EntryZone {
  min: number;
  max: number;
}

export interface OpportunityTarget {
  price: number;
  percentage: number;
}

export interface OpportunitySetup {
  id: string;
  symbol: string;
  exchange: string;
  pattern: OpportunityPattern;
  timeFrame: TimeFrame;
  currentPrice: number;
  entryZone: EntryZone;
  target: OpportunityTarget;
  invalidationPrice: number; // Stop / invalidation level
  riskRewardRatio: number;
  reasons: string[];
  detectedAt: number;
}

/**
 * Risk Assessment Contracts
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'REJECTED';

export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0 - 100 (lower score = lower risk)
  isTradable: boolean;
  reasons: string[];
  evaluatedAt: number;
}

/**
 * Alerting & Dispatch Contracts
 */

export type AlertStatus = 'PENDING' | 'DISPATCHED' | 'FAILED' | 'EXPIRED';

export interface AlertNotification {
  id: string;
  setup: OpportunitySetup;
  risk: RiskAssessment;
  status: AlertStatus;
  channel: 'TELEGRAM' | 'INTERNAL_API';
  dispatchedAt?: number;
  errorMessage?: string;
}

/**
 * Pluggable Exchange Connector Interface
 */

export interface ExchangeConnector {
  readonly exchangeId: string;
  getTopTickers(minQuoteVolumeUsd?: number): Promise<Ticker24h[]>;
  getCandles(symbol: string, interval: TimeFrame, limit?: number): Promise<Candle[]>;
  getTicker(symbol: string): Promise<Ticker24h>;
}
