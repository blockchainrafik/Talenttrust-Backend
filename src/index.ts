/**
 * @module index
 * @description TalentTrust Backend – application entry point.
 *
 * Wires together Express, structured-logging middleware, and route handlers.
 * The Express `app` is exported so integration tests can import it without
 * starting a real TCP listener.
 */

import express, { Request, Response } from 'express';
import { requestIdMiddleware } from './middleware/requestId';
import { httpLoggerMiddleware } from './middleware/httpLogger';
import { logger } from './logger';

export const app = express();
const PORT = process.env['PORT'] ?? 3001;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());

// 1. Attach requestId / correlationId to every request first.
app.use(requestIdMiddleware);

// 2. Emit structured access-log records (needs res.locals.log from step 1).
app.use(httpLoggerMiddleware);

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

app.get('/api/v1/contracts', (_req: Request, res: Response) => {
  res.json({ contracts: [] });
});

// ── Server bootstrap ──────────────────────────────────────────────────────────

/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('server started', { port: PORT });
  });
}
