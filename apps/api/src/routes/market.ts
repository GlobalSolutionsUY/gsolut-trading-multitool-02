import { BinanceConnector } from '@gsolut/connector-binance';
import { createLogger } from '@gsolut/logger';
import type { Ticker24h } from '@gsolut/types';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

const logger = createLogger('MarketRoute');

export interface StablecoinConfig {
  symbol: string;
  name: string;
  pegTarget: number;
}

export const KNOWN_STABLECOIN_PAIRS: StablecoinConfig[] = [
  { symbol: 'USDCUSDT', name: 'USD Coin', pegTarget: 1.0 },
  { symbol: 'FDUSDUSDT', name: 'First Digital USD', pegTarget: 1.0 },
  { symbol: 'DAIUSDT', name: 'Dai Stablecoin', pegTarget: 1.0 },
  { symbol: 'EURUSDT', name: 'Euro Tether', pegTarget: 1.08 },
  { symbol: 'USDPUSDT', name: 'Pax Dollar', pegTarget: 1.0 },
];

export interface StablecoinItem {
  symbol: string;
  name: string;
  price: number;
  pegTarget: number;
  deviationPercent: number;
  isPegged: boolean;
  volume24h: number;
  quoteVolume24h: number;
  high24h: number;
  low24h: number;
  priceChangePercent: number;
  updatedAt: string;
}

export interface MarketRouteOptions {
  connector?: BinanceConnector;
  stables?: StablecoinConfig[];
}

export async function fetchStablecoinData(
  connector: BinanceConnector,
  configs: StablecoinConfig[] = KNOWN_STABLECOIN_PAIRS,
): Promise<StablecoinItem[]> {
  const items: StablecoinItem[] = [];

  for (const config of configs) {
    try {
      const ticker: Ticker24h = await connector.getTicker(config.symbol);
      const deviationPercent =
        Math.round(((ticker.lastPrice - config.pegTarget) / config.pegTarget) * 10000) / 100;
      const isPegged = Math.abs(deviationPercent) <= 0.15; // within ±0.15%

      items.push({
        symbol: config.symbol,
        name: config.name,
        price: ticker.lastPrice,
        pegTarget: config.pegTarget,
        deviationPercent,
        isPegged,
        volume24h: ticker.volume24h,
        quoteVolume24h: ticker.quoteVolume24h,
        high24h: ticker.highPrice24h,
        low24h: ticker.lowPrice24h,
        priceChangePercent: ticker.priceChangePercent,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn(`Failed to fetch ticker for ${config.symbol}: ${err}`);
    }
  }

  return items;
}

export function createMarketRoutes(options: MarketRouteOptions = {}) {
  const connector = options.connector ?? new BinanceConnector();
  const stablesConfig = options.stables ?? KNOWN_STABLECOIN_PAIRS;

  const router = new Hono()
    .get('/stables', async (c) => {
      const items = await fetchStablecoinData(connector, stablesConfig);
      return c.json({
        totalCount: items.length,
        timestamp: new Date().toISOString(),
        items,
      });
    })
    .get('/stables/stream', (c) => {
      return streamSSE(c, async (stream) => {
        logger.debug('New client connected to /api/market/stables/stream');

        // Initial snapshot
        const initial = await fetchStablecoinData(connector, stablesConfig);
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'stables_snapshot',
            timestamp: new Date().toISOString(),
            items: initial,
          }),
          event: 'message',
        });

        // 3-second live update loop
        while (!stream.aborted) {
          await stream.sleep(3000);
          try {
            const updated = await fetchStablecoinData(connector, stablesConfig);
            await stream.writeSSE({
              data: JSON.stringify({
                type: 'stables_tick',
                timestamp: new Date().toISOString(),
                items: updated,
              }),
              event: 'message',
            });
          } catch {
            break;
          }
        }
      });
    });

  return router;
}
