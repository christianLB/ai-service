import {
  Tag,
  CreateTag,
  UpdateTag,
  TagQuery,
  TagSearch,
  EntityTag,
  EntityType,
  TagEntityRequest,
  BatchTagRequest,
  ReTagRequest,
  TagFeedback,
  TagLearning,
  DeleteTagOptions,
  UpdateEntityTag
} from '../../types/tagging/tag.types';

import {
  TagResponse,
  TagListResponse,
  TagSearchResponse,
  EntityTagsResponse,
  TagEntityResponse,
  BatchTagResponse,
  ReTagResponse,
  TagMetricsResponse,
  AccuracyResponse,
  RelationshipsResponse,
  FindEntitiesByTagResponse,
  FeedbackResponse,
  LearningResponse
} from '../../types/tagging/response.types';

// Tag management service interface
export interface ITagService {
  // CRUD operations
  createTag(data: CreateTag, userId: string): Promise<TagResponse>;
  getTag(tagId: string): Promise<TagResponse>;
  updateTag(tagId: string, data: UpdateTag, userId: string): Promise<TagResponse>;
  deleteTag(tagId: string, options?: DeleteTagOptions, userId: string): Promise<void>;
  listTags(query: TagQuery): Promise<TagListResponse>;
  searchTags(search: TagSearch): Promise<TagSearchResponse>;
  
  // Hierarchy operations
  getTagHierarchy(parentId?: string): Promise<Tag[]>;
  getTagPath(tagId: string): Promise<string[]>;
  
  // Bulk operations
  bulkCreateTags(tags: CreateTag[], userId: string): Promise<Tag[]>;
  bulkUpdateTags(updates: Array<{ id: string; data: UpdateTag }>, userId: string): Promise<Tag[]>;
}

// Entity tagging service interface
export interface IEntityTaggingService {
  // Single entity operations
  tagEntity(
    entityType: EntityType,
    entityId: string,
    request: TagEntityRequest,
    userId: string
  ): Promise<TagEntityResponse>;
  
  getEntityTags(
    entityType: EntityType,
    entityId: string
  ): Promise<EntityTagsResponse>;
  
  removeEntityTag(
    entityType: EntityType,
    entityId: string,
    tagId: string,
    userId: string
  ): Promise<void>;
  
  updateEntityTag(
    entityType: EntityType,
    entityId: string,
    tagId: string,
    data: UpdateEntityTag,
    userId: string
  ): Promise<EntityTagResponse>;
  
  // Batch operations
  batchTagEntities(
    request: BatchTagRequest,
    userId: string
  ): Promise<BatchTagResponse>;
  
  reTagEntities(
    request: ReTagRequest,
    userId: string
  ): Promise<ReTagResponse>;
  
  // Search and discovery
  findEntitiesByTag(
    tagId: string,
    types?: EntityType[],
    pagination?: { page: number; limit: number }
  ): Promise<FindEntitiesByTagResponse>;
  
  discoverRelationships(
    entityType: EntityType,
    entityId: string
  ): Promise<RelationshipsResponse>;
}

// AI tagging service interface
export interface IAITaggingService {
  // AI-powered tagging
  suggestTags(
    content: string,
    entityType: EntityType,
    metadata?: Record<string, any>,
    options?: {
      provider?: 'claude' | 'openai';
      maxTags?: number;
      confidenceThreshold?: number;
    }
  ): Promise<Array<{
    tagId: string;
    confidence: number;
    reasoning?: string;
  }>>;
  
  // Pattern learning
  learnFromFeedback(feedback: TagFeedback): Promise<FeedbackResponse>;
  learnFromCorrection(learning: TagLearning): Promise<LearningResponse>;
  
  // Pattern management
  updateTagPatterns(tagId: string, entityExamples: string[]): Promise<void>;
  testTagPattern(tagId: string, content: string): Promise<{ matches: boolean; confidence: number }>;
}

// Analytics service interface
export interface ITagAnalyticsService {
  // Metrics
  getTagMetrics(
    tagId: string,
    period?: { start: Date; end: Date }
  ): Promise<TagMetricsResponse>;
  
  getSystemAccuracy(
    period?: string,
    entityType?: EntityType
  ): Promise<AccuracyResponse>;
  
  // Reports
  generateUsageReport(
    period: { start: Date; end: Date },
    groupBy?: 'tag' | 'entity' | 'user'
  ): Promise<any>;
  
  generateAccuracyReport(
    period: { start: Date; end: Date }
  ): Promise<any>;
  
  // Real-time metrics
  getRealtimeMetrics(): Promise<{
    tagsPerMinute: number;
    avgConfidence: number;
    activeUsers: number;
    topTags: Array<{ tagId: string; count: number }>;
  }>;
}

// Pattern matching service interface
export interface IPatternMatchingService {
  // Pattern operations
  matchPatterns(
    content: string,
    entityType: EntityType,
    metadata?: Record<string, any>
  ): Promise<Array<{
    tagId: string;
    confidence: number;
    matchedPattern: string;
  }>>;
  
  validatePattern(pattern: string): Promise<{ valid: boolean; error?: string }>;
  
  // Bulk pattern matching
  batchMatchPatterns(
    entities: Array<{
      id: string;
      content: string;
      metadata?: Record<string, any>;
    }>,
    entityType: EntityType
  ): Promise<Map<string, Array<{ tagId: string; confidence: number }>>>;
}

// Cache service interface
export interface ITagCacheService {
  // Tag cache
  getCachedTag(tagId: string): Promise<Tag | null>;
  setCachedTag(tag: Tag): Promise<void>;
  invalidateTag(tagId: string): Promise<void>;
  
  // Entity tag cache
  getCachedEntityTags(entityType: EntityType, entityId: string): Promise<EntityTag[] | null>;
  setCachedEntityTags(entityType: EntityType, entityId: string, tags: EntityTag[]): Promise<void>;
  invalidateEntityTags(entityType: EntityType, entityId: string): Promise<void>;
  
  // Pattern cache
  getCachedPatternMatch(hash: string): Promise<Array<{ tagId: string; confidence: number }> | null>;
  setCachedPatternMatch(hash: string, matches: Array<{ tagId: string; confidence: number }>): Promise<void>;
  
  // Bulk operations
  warmupCache(): Promise<void>;
  clearCache(): Promise<void>;
}

// Event service interface
export interface ITagEventService {
  // Event publishing
  publishTagCreated(tag: Tag): Promise<void>;
  publishTagUpdated(tag: Tag, changes: Partial<Tag>): Promise<void>;
  publishTagDeleted(tagId: string): Promise<void>;
  publishEntityTagged(entityType: EntityType, entityId: string, tags: EntityTag[]): Promise<void>;
  publishEntityTagRemoved(entityType: EntityType, entityId: string, tagId: string): Promise<void>;
  publishEntityTagVerified(entityType: EntityType, entityId: string, tagId: string, userId: string): Promise<void>;
}