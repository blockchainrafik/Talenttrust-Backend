import { Router } from 'express';
import { ContractsController } from '../controllers/contracts.controller';
import { validateSchema } from '../middleware/validate.middleware';
import { createContractSchema } from '../modules/contracts/dto/contract.dto';
import { registry } from '../docs/openapi-registry';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/contracts',
  summary: 'List contracts',
  responses: {
    200: {
      description: 'List of contracts',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/CreateContract' }
          }
        }
      }
    }
  }
});

// Configure routes for the Contracts module
router.get('/', ContractsController.getContracts);

registry.registerPath({
  method: 'post',
  path: '/contracts',
  summary: 'Create a contract',
  request: {
    body: {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateContract' }
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Contract created',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateContract' }
        }
      }
    }
  }
});

// Enforce Zod input validation on the POST route
router.post(
  '/', 
  validateSchema(createContractSchema), 
  ContractsController.createContract
);

export default router;
