import { createLogger } from '@gsolut/logger';
import { serve } from '@hono/node-server';
import { app } from './app.js';

const logger = createLogger('Server');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

logger.info(`Starting API server on http://${HOST}:${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST,
});
