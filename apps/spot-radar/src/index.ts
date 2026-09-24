import { createLogger } from '@gsolut/logger';
import { SpotScanner } from './scanner.js';

const logger = createLogger('SpotRadarApp');

function main() {
  logger.info('Initializing Spot Opportunity Radar daemon...');

  const intervalSeconds = Number.parseInt(process.env.SCAN_INTERVAL_SEC ?? '60', 10);
  const minQuoteVolumeUsd = Number.parseInt(process.env.MIN_VOLUME_USD ?? '2000000', 10);
  const maxPairsToScan = Number.parseInt(process.env.MAX_PAIRS_TO_SCAN ?? '30', 10);

  const scanner = new SpotScanner({
    minQuoteVolumeUsd,
    maxPairsToScan,
  });

  scanner.start(intervalSeconds);

  // Graceful shutdown handling
  const shutdown = () => {
    logger.info('Shutting down Spot Radar daemon...');
    scanner.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
