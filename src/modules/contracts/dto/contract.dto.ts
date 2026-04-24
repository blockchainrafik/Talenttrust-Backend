import { z } from 'zod';
import { registry } from '../../../docs/openapi-registry';

export const createContractSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(100).openapi({ example: 'DeFi Bridge Integration' }),
    description: z.string().min(10).openapi({ example: 'Integrate the Stellar bridge with our DeFi protocol' }),
    freelancerId: z.string().uuid().optional().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    budget: z.number().positive().openapi({ example: 500 }),
  }),
});

registry.register('CreateContract', createContractSchema.shape.body);

export type CreateContractDto = z.infer<typeof createContractSchema>['body'];
