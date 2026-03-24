import express, { Request, Response } from 'express';
import { createRateLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

//  Rate limiting 
// Applied only to /api/* routes to leave /health unthrottled for load-balancer
// probes and monitoring.
 
const apiLimiter = createRateLimiter({
  maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  abuseThreshold: Number(process.env.RATE_LIMIT_ABUSE_THRESHOLD) || 5,
  blockDurationMs: Number(process.env.RATE_LIMIT_BLOCK_MS) || 600_000,
});
 
app.use('/api/', apiLimiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

app.get('/api/v1/contracts',   (_req: Request, res: Response) => {
  res.json({ contracts: [] });
});

app.listen(PORT, () => {
  console.log(`TalentTrust API listening on http://localhost:${PORT}`);
});
