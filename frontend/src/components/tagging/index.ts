export { TagList } from './TagList';
export { TagForm } from './TagForm';
export { EntityTagger } from './EntityTagger';
export { TagSelector } from './TagSelector';
export { TagDisplay } from './TagDisplay';
export { BulkTagger } from './BulkTagger';

// Re-export types from service
export type { 
  Tag, 
  CreateTagDto, 
  UpdateTagDto, 
  TagQuery,
  EntityTag,
  TagEntityDto,
  BatchTagOperation,
  TagMetrics 
} from '../../services/taggingService';