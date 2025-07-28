import { Tag, EntityTag, EntityType } from './tag.types';

// Base response structure
export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
  path?: string;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// List response with pagination
export interface PaginatedResponse<T> extends BaseResponse<T> {
  pagination: PaginationMeta;
}

// Tag response DTOs
export interface TagResponse extends BaseResponse<Tag> {}

export interface TagListResponse extends PaginatedResponse<Tag[]> {}

export interface TagWithPath extends Tag {
  path: string;
  score?: number;
}

export interface TagSearchResponse extends BaseResponse<TagWithPath[]> {}

// Entity tag response DTOs
export interface EntityTagResponse extends EntityTag {
  tagCode: string;
  tagName: string;
}

export interface EntityTagsResponse extends BaseResponse<{
  entity: {
    type: EntityType;
    id: string;
    preview?: string;
  };
  tags: EntityTagResponse[];
}> {}

export interface TagEntityResponse extends BaseResponse<{
  entity: {
    type: EntityType;
    id: string;
  };
  tags: EntityTagResponse[];
  processingTime: number;
  aiProvider?: string;
}> {}

// Batch response DTOs
export interface BatchTagResult {
  entityId: string;
  status: 'success' | 'failed' | 'skipped';
  tags?: EntityTagResponse[];
  error?: string;
  processingTime: number;
}

export interface BatchTagResponse extends BaseResponse<{
  results: BatchTagResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    totalProcessingTime: number;
  };
}> {}

// Re-tag response
export interface ReTagResponse extends BaseResponse<{
  processed: number;
  tagged: number;
  failed: number;
  skipped: number;
  errors: Array<{
    entityId: string;
    error: string;
  }>;
  estimatedTimeMs: number;
}> {}

// Metrics response DTOs
export interface TagMetrics {
  usageCount: number;
  avgConfidence: number;
  verificationRate: number;
  trends: Array<{
    date: string;
    count: number;
    avgConfidence: number;
  }>;
}

export interface TagMetricsResponse extends BaseResponse<{
  tag: {
    id: string;
    code: string;
    name: string;
  };
  metrics: TagMetrics;
}> {}

export interface SystemAccuracy {
  accuracy: number;
  totalTagged: number;
  verified: number;
  corrected: number;
}

export interface AccuracyResponse extends BaseResponse<{
  overall: SystemAccuracy;
  byEntityType: Record<EntityType, {
    accuracy: number;
    count: number;
  }>;
  byMethod: Record<string, {
    accuracy: number;
  }>;
  period?: {
    start: string;
    end: string;
  };
}> {}

// Relationship response
export interface EntityRelationship {
  targetType: EntityType;
  targetId: string;
  relationshipType: string;
  confidence: number;
  discoveredBy: string;
  metadata?: Record<string, any>;
}

export interface RelationshipsResponse extends BaseResponse<{
  entity: {
    type: EntityType;
    id: string;
  };
  relationships: EntityRelationship[];
}> {}

// Find entities by tag response
export interface EntityPreview {
  type: EntityType;
  id: string;
  preview: string;
  taggedAt: string;
  confidence: number;
}

export interface FindEntitiesByTagResponse extends PaginatedResponse<EntityPreview[]> {
  tag: {
    id: string;
    code: string;
    name: string;
  };
}

// Feedback response
export interface FeedbackResponse extends BaseResponse<{
  message: string;
  processed: boolean;
}> {}

// Learning response
export interface LearningResponse extends BaseResponse<{
  message: string;
  patternsUpdated: boolean;
  confidenceAdjusted: boolean;
}> {}

// Error codes
export enum ErrorCode {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS'
}

// Rate limit headers
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

// Webhook event types
export enum WebhookEventType {
  TAG_CREATED = 'tag.created',
  TAG_UPDATED = 'tag.updated',
  TAG_DELETED = 'tag.deleted',
  ENTITY_TAGGED = 'entity.tagged',
  ENTITY_TAG_REMOVED = 'entity.tag.removed',
  ENTITY_TAG_VERIFIED = 'entity.tag.verified'
}

// Webhook payload
export interface WebhookPayload<T = any> {
  event: WebhookEventType;
  timestamp: string;
  data: T;
}