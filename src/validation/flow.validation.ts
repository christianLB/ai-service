import { z } from 'zod';

// Common workflow schemas
const nodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  parameters: z.record(z.any()).optional(),
});

const connectionSchema = z.object({
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

const workflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  nodes: z.array(nodeSchema).optional(),
  connections: z.array(connectionSchema).optional(),
  settings: z.record(z.any()).optional(),
});

// POST /flow-gen
export const flowGenSchema = z.object({
  body: z.object({
    description: z.string().min(1).max(1000),
    save: z.boolean().default(true),
  }),
});

// POST /flow-test
export const flowTestSchema = z.object({
  body: z.object({
    workflow: workflowSchema,
    testData: z.record(z.any()).optional(),
  }),
});

// POST /flow-update
export const flowUpdateSchema = z.object({
  body: z
    .object({
      workflowId: z.string().uuid(),
      changes: z.string().min(1).max(1000).optional(),
      description: z.string().min(1).max(1000).optional(),
    })
    .refine((data) => data.changes || data.description, {
      message: "Either 'changes' or 'description' must be provided",
    }),
});

// GET /flows
export const getFlowsSchema = z.object({
  query: z.object({
    active: z.enum(['true', 'false']).optional(),
  }),
});

// GET /flows/:id
export const getFlowByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// GET /performance
export const getPerformanceSchema = z.object({
  query: z.object({
    hours: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(168)).optional(),
  }),
});

// Type exports
export type FlowGenInput = z.infer<typeof flowGenSchema>;
export type FlowTestInput = z.infer<typeof flowTestSchema>;
export type FlowUpdateInput = z.infer<typeof flowUpdateSchema>;
export type GetFlowsQuery = z.infer<typeof getFlowsSchema>;
export type GetFlowByIdParams = z.infer<typeof getFlowByIdSchema>;
export type GetPerformanceQuery = z.infer<typeof getPerformanceSchema>;
