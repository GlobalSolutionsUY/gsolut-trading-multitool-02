import { BinanceConnector } from '@gsolut/connector-binance';
import { createLogger } from '@gsolut/logger';
import { type RadarStateStore, defaultRadarStore, detectSpotOpportunity } from '@gsolut/radar-spot';
import { evaluateRisk } from '@gsolut/risk-filter';
import type { OpportunitySetup } from '@gsolut/types';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

const logger = createLogger('RadarRoute');

export interface RadarRouteOptions {
  store?: RadarStateStore;
  connector?: BinanceConnector;
}

export function createRadarRoutes(options: RadarRouteOptions = {}) {
  const store = options.store ?? defaultRadarStore;
  const connector = options.connector ?? new BinanceConnector();

  const router = new Hono()
    .get('/candidates', (c) => {
      const candidates = store.getActiveOpportunities();
      return c.json({
        totalCount: candidates.length,
        timestamp: new Date().toISOString(),
        candidates,
      });
    })
    .get('/history', (c) => {
      const history = store.getHistory(50);
      return c.json({
        totalCount: history.length,
        timestamp: new Date().toISOString(),
        history,
      });
    })
    .get('/snapshot', (c) => {
      return c.json(store.getSnapshot());
    })
    .post('/scan', async (c) => {
      logger.info('Triggering manual radar scan cycle');
      store.setScanning(true);

      const startTime = Date.now();
      let detectedCount = 0;
      let scannedCount = 0;

      try {
        const topTickers = await connector.getTopTickers(2_000_000);
        scannedCount = Math.min(topTickers.length, 30); // Analyze top 30 liquid pairs
        const tickersToScan = topTickers.slice(0, 30);

        for (const ticker of tickersToScan) {
          try {
            const candles = await connector.getCandles(ticker.symbol, '15m', 50);
            const setup = detectSpotOpportunity(ticker.symbol, candles, ticker);

            if (setup) {
              const risk = evaluateRisk(setup, ticker);
              if (risk.isTradable) {
                store.registerOpportunity(setup);
                detectedCount++;
              }
            }
          } catch (pairErr) {
            logger.warn(`Failed to scan pair ${ticker.symbol}: ${pairErr}`);
          }
        }
      } catch (err) {
        logger.error(`Scan cycle failed: ${err}`);
        store.setScanning(false, scannedCount);
        return c.json(
          {
            error: 'Scan cycle encountered an error',
            message: err instanceof Error ? err.message : String(err),
          },
          500,
        );
      }

      store.setScanning(false, scannedCount);
      const durationMs = Date.now() - startTime;

      return c.json({
        success: true,
        scannedPairs: scannedCount,
        detectedCount,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    })
    .get('/stream', (c) => {
      return streamSSE(c, async (stream) => {
        // Send initial state snapshot on connect
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'snapshot',
            payload: store.getSnapshot(),
          }),
          event: 'message',
        });

        const onOpportunity = async (opp: OpportunitySetup) => {
          try {
            await stream.writeSSE({
              data: JSON.stringify({
                type: 'opportunity_detected',
                payload: opp,
              }),
              event: 'message',
            });
          } catch {
            // Stream might be closed
          }
        };

        const onScanComplete = async (event: unknown) => {
          try {
            await stream.writeSSE({
              data: JSON.stringify({
                type: 'scan_complete',
                payload: event,
              }),
              event: 'message',
            });
          } catch {
            // Stream might be closed
          }
        };

        store.on('opportunity', onOpportunity);
        store.on('scan_complete', onScanComplete);

        stream.onAbort(() => {
          store.off('opportunity', onOpportunity);
          store.off('scan_complete', onScanComplete);
        });

        // Keep-alive heartbeat every 15s
        while (!stream.aborted) {
          await stream.sleep(15_000);
          try {
            await stream.writeSSE({
              data: JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }),
              event: 'ping',
            });
          } catch {
            break;
          }
        }
      });
    });

  return router;
}
