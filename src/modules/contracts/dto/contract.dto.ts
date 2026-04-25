import { z } from 'zod';

// Base contract schema for common fields
const contractBaseSchema = {
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  freelancerId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  budget: z.number().positive().max(1000000),
  deadline: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED']).default('PENDING'),
  terms: z.string().optional(),
  milestones: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    amount: z.number().positive(),
    deadline: z.string().datetime().optional(),
    completed: z.boolean().default(false),
  })).optional(),
};

// Create contract schema with strict validation
export const createContractSchema = z.object({
  body: z.object(contractBaseSchema).strict(),
});

// Update contract schema with partial fields for PATCH
export const updateContractSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(10).max(1000).optional(),
    freelancerId: z.string().uuid().nullable().optional(),
    clientId: z.string().uuid().optional(),
    budget: z.number().positive().max(1000000).optional(),
    deadline: z.string().datetime().nullable().optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED']).optional(),
    terms: z.string().nullable().optional(),
    milestones: z.array(z.object({
      title: z.string().min(1).max(100),
      description: z.string().min(1).max(500),
      amount: z.number().positive(),
      deadline: z.string().datetime().optional(),
      completed: z.boolean().default(false),
    })).optional(),
  }).strict(),
});

// Query parameters schema for filtering and pagination
export const contractQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED']).optional(),
    clientId: z.string().uuid().optional(),
    freelancerId: z.string().uuid().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'budget', 'deadline']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }).strict(),
});

// Path parameter schema for contract ID
export const contractIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }).strict(),
});

// Response schemas for consistent API responses
export const contractResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  freelancerId: z.string().uuid().nullable(),
  clientId: z.string().uuid(),
  budget: z.number(),
  deadline: z.string().datetime().nullable(),
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED']),
  terms: z.string().nullable(),
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string(),
    amount: z.number(),
    deadline: z.string().datetime().nullable(),
    completed: z.boolean(),
  })).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const contractListResponseSchema = z.object({
  contracts: z.array(contractResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Export types
export type CreateContractDto = z.infer<typeof createContractSchema>['body'];
export type UpdateContractDto = z.infer<typeof updateContractSchema>['body'];
export type ContractQueryParams = z.infer<typeof contractQuerySchema>['query'];
export type ContractIdParams = z.infer<typeof contractIdSchema>['params'];
export type ContractResponse = z.infer<typeof contractResponseSchema>;
export type ContractListResponse = z.infer<typeof contractListResponseSchema>;
