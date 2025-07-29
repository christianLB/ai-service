// Export container
export { taggingContainer } from './container';

// Import types for helper functions
import { taggingContainer } from './container';
import { TAGGING_SERVICE_IDENTIFIERS } from './identifiers';
import { ITagService, IEntityTaggingService, IAITaggingService, IPatternMatchingService } from './interfaces';

// Helper functions to get services lazily
export const getTagService = () => taggingContainer.get<ITagService>(TAGGING_SERVICE_IDENTIFIERS.TagService);
export const getEntityTaggingService = () => taggingContainer.get<IEntityTaggingService>(TAGGING_SERVICE_IDENTIFIERS.EntityTaggingService);
export const getAITaggingService = () => taggingContainer.get<IAITaggingService>(TAGGING_SERVICE_IDENTIFIERS.AITaggingService);
export const getPatternMatchingService = () => taggingContainer.get<IPatternMatchingService>(TAGGING_SERVICE_IDENTIFIERS.PatternMatchingService);

// Export service identifiers
export { TAGGING_SERVICE_IDENTIFIERS } from './identifiers';

// Export interfaces
export * from './interfaces';

// Export error classes
export * from './errors';

// Re-export types for convenience
export * from '../../types/tagging/tag.types';
export * from '../../types/tagging/response.types';