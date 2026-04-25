import { Router } from 'express';
import { ContractsController } from '../controllers/contracts.controller';
import { validateSchema } from '../middleware/validate.middleware';
import { 
  createContractSchema, 
  updateContractSchema, 
  contractQuerySchema, 
  contractIdSchema 
} from '../modules/contracts/dto/contract.dto';

const router = Router();

/**
 * Contracts CRUD API Routes
 * Base path: /api/v1/contracts
 */

// GET /api/v1/contracts - List contracts with filtering, sorting, and pagination
router.get(
  '/', 
  validateSchema(contractQuerySchema), 
  ContractsController.getContracts
);

// GET /api/v1/contracts/stats - Get contract statistics
router.get('/stats', ContractsController.getContractStats);

// GET /api/v1/contracts/:id - Get single contract by ID
router.get(
  '/:id', 
  validateSchema(contractIdSchema), 
  ContractsController.getContractById
);

// POST /api/v1/contracts - Create new contract
router.post(
  '/', 
  validateSchema(createContractSchema), 
  ContractsController.createContract
);

// PATCH /api/v1/contracts/:id - Update existing contract
router.patch(
  '/:id', 
  validateSchema(contractIdSchema), 
  validateSchema(updateContractSchema), 
  ContractsController.updateContract
);

// DELETE /api/v1/contracts/:id - Delete contract
router.delete(
  '/:id', 
  validateSchema(contractIdSchema), 
  ContractsController.deleteContract
);

export default router;
