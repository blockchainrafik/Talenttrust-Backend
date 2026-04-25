import { z } from 'zod';

export const createContractSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(100),
    description: z.string().min(10),
    freelancerId: z.string().uuid().optional(),
    budget: z.number().positive(),
  }),
});

export type CreateContractDto = z.infer<typeof createContractSchema>['body'];

export const updateContractSchema = z.object({
  body: z.object({
    version: z.number().int().min(0),
    title: z.string().min(5).max(100).optional(),
    status: z.enum(['draft', 'active', 'completed', 'disputed', 'cancelled']).optional(),
  }),
});

export type UpdateContractDto = z.infer<typeof updateContractSchema>['body'];
