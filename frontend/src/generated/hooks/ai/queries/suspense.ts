// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryOptions, useSuspenseQuery } from '@tanstack/react-query';
import {
  EntityTaggingService,
  IntegrationConfigService,
  TagsService,
  TelegramService,
} from '../requests/services.gen';
import { EntityType } from '../requests/types.gen';
import * as Common from './common';
export const useTagsServiceListTagsSuspense = <
  TData = Common.TagsServiceListTagsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseTagsServiceListTagsKeyFn(
      { entityType, isActive, limit, page, parentId, search, sortBy, sortOrder },
      queryKey
    ),
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
      }) as TData,
    ...options,
  });
export const useTagsServiceGetTagSuspense = <
  TData = Common.TagsServiceGetTagDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    tagId,
  }: {
    tagId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseTagsServiceGetTagKeyFn({ tagId }, queryKey),
    queryFn: () => TagsService.getTag({ tagId }) as TData,
    ...options,
  });
export const useEntityTaggingServiceGetEntityTagsSuspense = <
  TData = Common.EntityTaggingServiceGetEntityTagsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: EntityType;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseEntityTaggingServiceGetEntityTagsKeyFn({ entityId, entityType }, queryKey),
    queryFn: () => EntityTaggingService.getEntityTags({ entityId, entityType }) as TData,
    ...options,
  });
export const useEntityTaggingServiceFindEntitiesByTagSuspense = <
  TData = Common.EntityTaggingServiceFindEntitiesByTagDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseEntityTaggingServiceFindEntitiesByTagKeyFn(
      { entityType, limit, minConfidence, page, tagId },
      queryKey
    ),
    queryFn: () =>
      EntityTaggingService.findEntitiesByTag({
        entityType,
        limit,
        minConfidence,
        page,
        tagId,
      }) as TData,
    ...options,
  });
export const useEntityTaggingServiceGetTaggingLearningStatsSuspense = <
  TData = Common.EntityTaggingServiceGetTaggingLearningStatsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseEntityTaggingServiceGetTaggingLearningStatsKeyFn(queryKey),
    queryFn: () => EntityTaggingService.getTaggingLearningStats() as TData,
    ...options,
  });
export const useTelegramServiceGetTelegramChatInfoSuspense = <
  TData = Common.TelegramServiceGetTelegramChatInfoDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    chatId,
  }: {
    chatId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseTelegramServiceGetTelegramChatInfoKeyFn({ chatId }, queryKey),
    queryFn: () => TelegramService.getTelegramChatInfo({ chatId }) as TData,
    ...options,
  });
export const useIntegrationConfigServiceListConfigsByTypeSuspense = <
  TData = Common.IntegrationConfigServiceListConfigsByTypeDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    type,
  }: {
    type: 'ai' | 'telegram' | 'notification' | 'integration';
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseIntegrationConfigServiceListConfigsByTypeKeyFn({ type }, queryKey),
    queryFn: () => IntegrationConfigService.listConfigsByType({ type }) as TData,
    ...options,
  });
export const useIntegrationConfigServiceGetIntegrationConfigSuspense = <
  TData = Common.IntegrationConfigServiceGetIntegrationConfigDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    key,
    type,
  }: {
    key: string;
    type: 'ai' | 'telegram' | 'notification' | 'integration';
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseIntegrationConfigServiceGetIntegrationConfigKeyFn({ key, type }, queryKey),
    queryFn: () => IntegrationConfigService.getIntegrationConfig({ key, type }) as TData,
    ...options,
  });
