/**
 * @module app
 * @description Express application factory.
 *
 * Separates app configuration from server bootstrap so the app can be
 * imported in tests without binding to a port.
 *
 * @security
 *  - express.json() body parser is scoped to this app instance only.
 *  - All routes return JSON; no HTML rendering surface.
 *  - Helmet-style headers should be added here when the dependency is
 *    introduced (tracked in docs/backend/security.md).
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { healthRouter } from './routes/health';
import contractsModuleRouter from './routes/contracts.routes';
import reputationRouter from './routes/reputation.routes';
import authRouter from './routes/auth.routes';
import { requestIdMiddleware } from './middleware/requestId';
import { createRateLimiter } from './middleware/rateLimiter';
import { rateLimitConfig, rateLimitStore } from './config/rateLimit';

/**
 * Creates and configures the Express application.
 *
 * @returns Configured Express app instance (not yet listening).
 */
export function createApp(): express.Application {
  const app = express();

  // ── Middleware ────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(requestIdMiddleware);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/health', healthRouter);

  // Auth routes: strict rate limiting to prevent credential stuffing
  app.use('/api/v1/auth', createRateLimiter(rateLimitConfig.strict), authRouter);

  // Standard tier: all /api endpoints get base rate limiting
  app.use('/api/v1/contracts', createRateLimiter(rateLimitConfig.standard), contractsModuleRouter);
  app.use('/api/v1/reputation', createRateLimiter(rateLimitConfig.standard), reputationRouter);

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // ── Global error handler ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}

/** Shutdown handler for graceful termination. */
export function shutdownRateLimitStore(): void {
  rateLimitStore.destroy();
  console.log('[rateLimit] Store shutdown complete');
}
