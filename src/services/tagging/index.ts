// Export services from container
export {
  taggingContainer,
  tagService,
  entityTaggingService,
  aiTaggingService,
  patternMatchingService
} from './container';

// Export service identifiers
export { TAGGING_SERVICE_IDENTIFIERS } from './identifiers';

// Export interfaces
export * from './interfaces';

// Export error classes
export * from './errors';

// Re-export types for convenience
export * from '../../types/tagging/tag.types';
export * from '../../types/tagging/response.types';