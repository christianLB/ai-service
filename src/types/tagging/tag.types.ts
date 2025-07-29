import { z } from 'zod';

// Enums
export const EntityTypeEnum = z.enum(['transaction', 'document', 'client', 'invoice']);
export const TagMethodEnum = z.enum(['AI', 'PATTERN', 'MANUAL', 'AUTO']);
export const TagConfidenceLevel = z.enum(['HIGH', 'MEDIUM', 'LOW']);

// Tag patterns schema
export const tagPatternsSchema = z.object({
  keywords: z.array(z.string()).optional(),
  merchants: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  regex: z.string().optional(),
  customRules: z.record(z.any()).optional()
});

// Base Tag schema (matches UniversalTag model)
export const tagSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string()
    .min(1, 'Tag code is required')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Tag code must be uppercase with underscores'),
  name: z.string().min(1, 'Tag name is required'),
  description: z.string().optional().nullable(),
  entityTypes: z.array(EntityTypeEnum).min(1, 'At least one entity type is required'),
  patterns: tagPatternsSchema.optional().nullable(),
  rules: z.record(z.any()).optional().nullable(),
  confidence: z.number().min(0).max(1).default(0.5),
  embeddingModel: z.string().max(50).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  path: z.string(),
  level: z.number().int().min(0).default(0),
  color: z.string().max(7).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  metadata: z.record(z.any()).optional().nullable(),
  usageCount: z.number().int().min(0).default(0),
  successRate: z.number().min(0).max(1).default(0.0),
  lastUsed: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Create tag schema
export const createTagSchema = tagSchema.omit({
  id: true,
  path: true, // Generated based on parent
  level: true, // Calculated based on parent
  usageCount: true,
  successRate: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true
});

// Update tag schema
export const updateTagSchema = tagSchema.partial().omit({
  id: true,
  code: true, // Code cannot be changed
  path: true, // Generated based on parent
  level: true, // Calculated based on parent
  createdAt: true
});

// Tag query schema
export const tagQuerySchema = z.object({
  entityType: EntityTypeEnum.optional(),
  search: z.string().optional(),
  parentId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'code', 'usageCount', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  isActive: z.coerce.boolean().optional()
});

// Tag search schema
export const tagSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  entityType: EntityTypeEnum.optional(),
  limit: z.coerce.number().int().positive().max(50).default(10)
});

// Entity tag schema
export const entityTagSchema = z.object({
  id: z.string().uuid().optional(),
  entityType: EntityTypeEnum,
  entityId: z.string(),
  tagId: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  method: TagMethodEnum,
  appliedAt: z.date().optional(),
  appliedBy: z.string().optional(),
  isVerified: z.boolean().default(false),
  verifiedBy: z.string().optional().nullable(),
  verifiedAt: z.date().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable()
});

// Tag entity request schema
export const tagEntityRequestSchema = z.object({
  method: z.enum(['auto', 'ai', 'pattern', 'manual']).default('auto'),
  options: z.object({
    aiProvider: z.enum(['claude', 'openai']).optional(),
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
    maxTags: z.number().int().positive().max(10).default(5),
    includeRelated: z.boolean().default(false),
    forceReTag: z.boolean().default(false)
  }).optional()
});

// Batch tag request schema
export const batchTagRequestSchema = z.object({
  entities: z.array(z.object({
    type: EntityTypeEnum,
    id: z.string(),
    content: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).min(1).max(100),
  options: tagEntityRequestSchema.shape.options
});

// Re-tag request schema
export const reTagRequestSchema = z.object({
  filter: z.object({
    entityType: EntityTypeEnum.optional(),
    dateRange: z.object({
      start: z.coerce.date(),
      end: z.coerce.date()
    }).optional(),
    tags: z.array(z.string()).optional(),
    hasNoTags: z.boolean().optional()
  }),
  options: z.object({
    method: z.enum(['ai', 'pattern']).default('ai'),
    batchSize: z.number().int().positive().max(1000).default(100),
    dryRun: z.boolean().default(false)
  })
});

// Feedback schema
export const tagFeedbackSchema = z.object({
  entityType: EntityTypeEnum,
  entityId: z.string(),
  entityTagId: z.string().uuid(),
  feedback: z.object({
    isCorrect: z.boolean(),
    suggestedTagId: z.string().uuid().optional(),
    reason: z.string().optional(),
    confidence: z.number().min(0).max(1).optional()
  })
});

// Learning schema
export const tagLearningSchema = z.object({
  entityType: EntityTypeEnum,
  entityId: z.string(),
  correctTagId: z.string().uuid(),
  previousTagId: z.string().uuid().optional(),
  context: z.record(z.any()).optional()
});

// Delete tag options schema
export const deleteTagOptionsSchema = z.object({
  reassignTo: z.string().uuid().optional()
});

// Update entity tag schema
export const updateEntityTagSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  isVerified: z.boolean().optional()
});

// Types
export type EntityType = z.infer<typeof EntityTypeEnum>;
export type TagMethod = z.infer<typeof TagMethodEnum>;
export type Tag = z.infer<typeof tagSchema>;
export type CreateTag = z.infer<typeof createTagSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;
export type TagQuery = z.infer<typeof tagQuerySchema>;
export type TagSearch = z.infer<typeof tagSearchSchema>;
export type EntityTag = z.infer<typeof entityTagSchema>;
export type TagEntityRequest = z.infer<typeof tagEntityRequestSchema>;
export type BatchTagRequest = z.infer<typeof batchTagRequestSchema>;
export type ReTagRequest = z.infer<typeof reTagRequestSchema>;
export type TagFeedback = z.infer<typeof tagFeedbackSchema>;
export type TagLearning = z.infer<typeof tagLearningSchema>;
export type DeleteTagOptions = z.infer<typeof deleteTagOptionsSchema>;
export type UpdateEntityTag = z.infer<typeof updateEntityTagSchema>;