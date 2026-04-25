import { Router } from 'express';
import { ReputationController } from '../controllers/reputation.controller';
import { createRateLimiter } from '../middleware/rateLimiter';
import { rateLimitConfig } from '../config/rateLimit';

const router = Router();

/**
 * @title Reputation API Routes
 * @dev NatSpec: Exposes REST API paths for the Freelancer Reputation Profile API.
 */

// GET /api/v1/reputation/:id - Retrieve reputation for a freelancer
router.get('/:id', ReputationController.getProfile);

// PUT /api/v1/reputation/:id - Update reputation for a freelancer (add review)
// Uses sensitive tier: stricter limits for write operations
router.put('/:id', createRateLimiter(rateLimitConfig.sensitive), ReputationController.updateProfile);

export default router;
