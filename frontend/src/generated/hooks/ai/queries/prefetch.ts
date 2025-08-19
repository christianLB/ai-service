// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { type QueryClient } from '@tanstack/react-query';
import {
  EntityTaggingService,
  IntegrationConfigService,
  TagsService,
  TelegramService,
} from '../requests/services.gen';
import { EntityType } from '../requests/types.gen';
import * as Common from './common';
export const prefetchUseTagsServiceListTags = (
  queryClient: QueryClient,
  {
    entityType,
    isActive,
    limit,
    page,
    parentId,
    search,
    sortBy,
    sortOrder,
  }: {
    entityType?: EntityType;
    isActive?: boolean;
    limit?: number;
    page?: number;
    parentId?: string;
    search?: string;
    sortBy?: 'name' | 'code' | 'usageCount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseTagsServiceListTagsKeyFn({
      entityType,
      isActive,
      limit,
      page,
      parentId,
      search,
      sortBy,
      sortOrder,
    }),
    queryFn: () =>
      TagsService.listTags({
        entityType,
        isActive,
        limit,
        page,
        parentId,
        search,
        sortBy,
        sortOrder,
      }),
  });
export const prefetchUseTagsServiceGetTag = (
  queryClient: QueryClient,
  {
    tagId,
  }: {
    tagId: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseTagsServiceGetTagKeyFn({ tagId }),
    queryFn: () => TagsService.getTag({ tagId }),
  });
export const prefetchUseEntityTaggingServiceGetEntityTags = (
  queryClient: QueryClient,
  {
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: EntityType;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseEntityTaggingServiceGetEntityTagsKeyFn({ entityId, entityType }),
    queryFn: () => EntityTaggingService.getEntityTags({ entityId, entityType }),
  });
export const prefetchUseEntityTaggingServiceFindEntitiesByTag = (
  queryClient: QueryClient,
  {
    entityType,
    limit,
    minConfidence,
    page,
    tagId,
  }: {
    entityType?: EntityType;
    limit?: number;
    minConfidence?: number;
    page?: number;
    tagId: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseEntityTaggingServiceFindEntitiesByTagKeyFn({
      entityType,
      limit,
      minConfidence,
      page,
      tagId,
    }),
    queryFn: () =>
      EntityTaggingService.findEntitiesByTag({ entityType, limit, minConfidence, page, tagId }),
  });
export const prefetchUseEntityTaggingServiceGetTaggingLearningStats = (queryClient: QueryClient) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseEntityTaggingServiceGetTaggingLearningStatsKeyFn(),
    queryFn: () => EntityTaggingService.getTaggingLearningStats(),
  });
export const prefetchUseTelegramServiceGetTelegramChatInfo = (
  queryClient: QueryClient,
  {
    chatId,
  }: {
    chatId: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseTelegramServiceGetTelegramChatInfoKeyFn({ chatId }),
    queryFn: () => TelegramService.getTelegramChatInfo({ chatId }),
  });
export const prefetchUseIntegrationConfigServiceListConfigsByType = (
  queryClient: QueryClient,
  {
    type,
  }: {
    type: 'ai' | 'telegram' | 'notification' | 'integration';
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseIntegrationConfigServiceListConfigsByTypeKeyFn({ type }),
    queryFn: () => IntegrationConfigService.listConfigsByType({ type }),
  });
export const prefetchUseIntegrationConfigServiceGetIntegrationConfig = (
  queryClient: QueryClient,
  {
    key,
    type,
  }: {
    key: string;
    type: 'ai' | 'telegram' | 'notification' | 'integration';
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseIntegrationConfigServiceGetIntegrationConfigKeyFn({ key, type }),
    queryFn: () => IntegrationConfigService.getIntegrationConfig({ key, type }),
  });
