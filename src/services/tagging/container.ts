import 'reflect-metadata';
import { Container } from 'inversify';
import {
  ITagService,
  IEntityTaggingService,
  IAITaggingService,
  IPatternMatchingService,
} from './interfaces';
import { TagService } from './tag.service';
import { EntityTaggingService } from './entity-tagging.service';
import { AITaggingService } from './ai-tagging.service';
import { PatternMatchingService } from './pattern-matching.service';
import { TAGGING_SERVICE_IDENTIFIERS } from './identifiers';

// Create and configure the container
export function createTaggingContainer(): Container {
  const container = new Container({ defaultScope: 'Singleton' });

  // Bind services
  container
    .bind<ITagService>(TAGGING_SERVICE_IDENTIFIERS.TagService)
    .to(TagService)
    .inSingletonScope();

  container
    .bind<IAITaggingService>(TAGGING_SERVICE_IDENTIFIERS.AITaggingService)
    .to(AITaggingService)
    .inSingletonScope();

  container
    .bind<IPatternMatchingService>(TAGGING_SERVICE_IDENTIFIERS.PatternMatchingService)
    .to(PatternMatchingService)
    .inSingletonScope();

  container
    .bind<IEntityTaggingService>(TAGGING_SERVICE_IDENTIFIERS.EntityTaggingService)
    .to(EntityTaggingService)
    .inSingletonScope();

  return container;
}

// Export a singleton container instance
export const taggingContainer = createTaggingContainer();
