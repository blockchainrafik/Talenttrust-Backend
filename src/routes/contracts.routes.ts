import { Router } from 'express';
import { ContractsController } from '../controllers/contracts.controller';
import { validateSchema } from '../middleware/validate.middleware';
import { createContractSchema } from '../modules/contracts/dto/contract.dto';
import { validateUpdateContract } from '../modules/contracts/validation.middleware';

const router = Router();

// Configure routes for the Contracts module
router.get('/', ContractsController.getContracts);
router.get('/:id', ContractsController.getContractById);

// Enforce Zod input validation on the POST route
router.post(
  '/', 
  validateSchema(createContractSchema), 
  ContractsController.createContract
);

// OCC-aware update: validate version field before delegating to controller
router.patch('/:id', validateUpdateContract, ContractsController.updateContract);

export default router;
