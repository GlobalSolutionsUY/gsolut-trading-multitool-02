import { createLogger } from '@gsolut/logger';
import type { Candle } from '@gsolut/types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { type RadarRouteOptions, createRadarRoutes } from './routes/radar.js';

const logger = createLogger('API');

export function createApp(options: RadarRouteOptions = {}) {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  );

  // Global request logging
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    logger.debug(`${c.req.method} ${c.req.path} -> ${c.res.status} (${Date.now() - start}ms)`);
  });

  // Chained routes for type-safe RPC
  const routes = app
    .get('/health', (c) => {
      return c.json({
        status: 'ok' as const,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    })
    .get('/api/status', (c) => {
      return c.json({
        service: 'trading-multitool-api',
        version: '0.1.0',
        activeProvider: 'binance',
        engine: 'spot-rebound-radar',
        timestamp: new Date().toISOString(),
      });
    })
    .get('/api/test-candles', (c) => {
      // Deterministic synthetic candle sequence for client plotting/charting test
      const now = Date.now();
      const intervalMs = 15 * 60 * 1000;
      let basePrice = 64000;

      const candles: Candle[] = Array.from({ length: 30 }, (_, i) => {
        const time = now - (30 - i) * intervalMs;
        const volatility = Math.sin(i / 2) * 200 + (i > 20 ? (i - 20) * 80 : -(i * 20));
        const open = basePrice;
        const close = basePrice + volatility;
        const high = Math.max(open, close) + 60;
        const low = Math.min(open, close) - (i === 24 ? 280 : 50); // Big rejection wick at candle 24
        const volume = i === 24 ? 1250 : 250 + (i % 5) * 40;

        basePrice = close;

        return {
          openTime: time,
          open: Math.round(open * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume,
          closeTime: time + intervalMs - 1,
          quoteVolume: volume * close,
        };
      });

      return c.json({
        symbol: 'BTCUSDT',
        interval: '15m' as const,
        candles,
      });
    })
    .route('/api/radar/spot', createRadarRoutes(options));

  return routes;
}

export const app = createApp();
export type AppType = typeof app;
