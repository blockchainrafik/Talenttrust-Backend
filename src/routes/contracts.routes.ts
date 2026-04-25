import { Router } from 'express';
import { ContractsController } from '../controllers/contracts.controller';
import { validateSchema } from '../middleware/validate.middleware';
import { createContractSchema } from '../modules/contracts/dto/contract.dto';
import { createRateLimiter } from '../middleware/rateLimiter';
import { rateLimitConfig } from '../config/rateLimit';

const router = Router();

router.get('/', ContractsController.getContracts);

router.post(
  '/',
  createRateLimiter(rateLimitConfig.strict),
  validateSchema(createContractSchema),
  ContractsController.createContract,
);

export default router;
