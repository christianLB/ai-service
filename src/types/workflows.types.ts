import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base Workflows schema
export const workflowsSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional().default(false),
  workflow_data: z.any(),
  version: z.number().int().optional().default(1),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  created_by: z.string().optional().nullable(),
  tags: z.array(z.string()),
});

// Create schema (omit id and timestamps)
export const createWorkflowsSchema = workflowsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (all fields optional except id)
export const updateWorkflowsSchema = workflowsSchema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const workflowsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
export type Workflows = z.infer<typeof workflowsSchema>;
export type CreateWorkflows = z.infer<typeof createWorkflowsSchema>;
export type UpdateWorkflows = z.infer<typeof updateWorkflowsSchema>;
export type WorkflowsQuery = z.infer<typeof workflowsQuerySchema>;

// Prisma types
export type WorkflowsWithRelations = Prisma.WorkflowsGetPayload<{
  include: {
    executions: true;
  };
}>;