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
export const ensureUseTagsServiceListTagsData = (
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
  queryClient.ensureQueryData({
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
export const ensureUseTagsServiceGetTagData = (
  queryClient: QueryClient,
  {
    tagId,
  }: {
    tagId: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseTagsServiceGetTagKeyFn({ tagId }),
    queryFn: () => TagsService.getTag({ tagId }),
  });
export const ensureUseEntityTaggingServiceGetEntityTagsData = (
  queryClient: QueryClient,
  {
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: EntityType;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseEntityTaggingServiceGetEntityTagsKeyFn({ entityId, entityType }),
    queryFn: () => EntityTaggingService.getEntityTags({ entityId, entityType }),
  });
export const ensureUseEntityTaggingServiceFindEntitiesByTagData = (
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
  queryClient.ensureQueryData({
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
export const ensureUseEntityTaggingServiceGetTaggingLearningStatsData = (
  queryClient: QueryClient
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseEntityTaggingServiceGetTaggingLearningStatsKeyFn(),
    queryFn: () => EntityTaggingService.getTaggingLearningStats(),
  });
export const ensureUseTelegramServiceGetTelegramChatInfoData = (
  queryClient: QueryClient,
  {
    chatId,
  }: {
    chatId: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseTelegramServiceGetTelegramChatInfoKeyFn({ chatId }),
    queryFn: () => TelegramService.getTelegramChatInfo({ chatId }),
  });
export const ensureUseIntegrationConfigServiceListConfigsByTypeData = (
  queryClient: QueryClient,
  {
    type,
  }: {
    type: 'ai' | 'telegram' | 'notification' | 'integration';
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseIntegrationConfigServiceListConfigsByTypeKeyFn({ type }),
    queryFn: () => IntegrationConfigService.listConfigsByType({ type }),
  });
export const ensureUseIntegrationConfigServiceGetIntegrationConfigData = (
  queryClient: QueryClient,
  {
    key,
    type,
  }: {
    key: string;
    type: 'ai' | 'telegram' | 'notification' | 'integration';
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseIntegrationConfigServiceGetIntegrationConfigKeyFn({ key, type }),
    queryFn: () => IntegrationConfigService.getIntegrationConfig({ key, type }),
  });
