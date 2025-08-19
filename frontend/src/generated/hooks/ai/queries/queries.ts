// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import {
  AiOperationsService,
  EntityTaggingService,
  IntegrationConfigService,
  TagsService,
  TelegramService,
} from '../requests/services.gen';
import {
  BatchTagRequest,
  CreateTagRequest,
  DeleteTagRequest,
  DocumentAnalysisRequest,
  EntityExtractionRequest,
  EntityType,
  ReTagRequest,
  SetConfigRequest,
  TagEntityRequest,
  TagFeedbackRequest,
  TagSearchRequest,
  TelegramMessageRequest,
  TelegramWebhookRequest,
  TextCategorizationRequest,
  UpdateEntityTagRequest,
  UpdateTagRequest,
} from '../requests/types.gen';
import * as Common from './common';
export const useTagsServiceListTags = <
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
  useQuery<TData, TError>({
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
export const useTagsServiceGetTag = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseTagsServiceGetTagKeyFn({ tagId }, queryKey),
    queryFn: () => TagsService.getTag({ tagId }) as TData,
    ...options,
  });
export const useEntityTaggingServiceGetEntityTags = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseEntityTaggingServiceGetEntityTagsKeyFn({ entityId, entityType }, queryKey),
    queryFn: () => EntityTaggingService.getEntityTags({ entityId, entityType }) as TData,
    ...options,
  });
export const useEntityTaggingServiceFindEntitiesByTag = <
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
  useQuery<TData, TError>({
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
export const useEntityTaggingServiceGetTaggingLearningStats = <
  TData = Common.EntityTaggingServiceGetTaggingLearningStatsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseEntityTaggingServiceGetTaggingLearningStatsKeyFn(queryKey),
    queryFn: () => EntityTaggingService.getTaggingLearningStats() as TData,
    ...options,
  });
export const useTelegramServiceGetTelegramChatInfo = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseTelegramServiceGetTelegramChatInfoKeyFn({ chatId }, queryKey),
    queryFn: () => TelegramService.getTelegramChatInfo({ chatId }) as TData,
    ...options,
  });
export const useIntegrationConfigServiceListConfigsByType = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseIntegrationConfigServiceListConfigsByTypeKeyFn({ type }, queryKey),
    queryFn: () => IntegrationConfigService.listConfigsByType({ type }) as TData,
    ...options,
  });
export const useIntegrationConfigServiceGetIntegrationConfig = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseIntegrationConfigServiceGetIntegrationConfigKeyFn({ key, type }, queryKey),
    queryFn: () => IntegrationConfigService.getIntegrationConfig({ key, type }) as TData,
    ...options,
  });
export const useTagsServiceCreateTag = <
  TData = Common.TagsServiceCreateTagMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: CreateTagRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: CreateTagRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      TagsService.createTag({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useTagsServiceSearchTags = <
  TData = Common.TagsServiceSearchTagsMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: TagSearchRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: TagSearchRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      TagsService.searchTags({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useEntityTaggingServiceTagEntity = <
  TData = Common.EntityTaggingServiceTagEntityMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        entityId: string;
        entityType: EntityType;
        requestBody: TagEntityRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      entityId: string;
      entityType: EntityType;
      requestBody: TagEntityRequest;
    },
    TContext
  >({
    mutationFn: ({ entityId, entityType, requestBody }) =>
      EntityTaggingService.tagEntity({
        entityId,
        entityType,
        requestBody,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useEntityTaggingServiceBatchTagEntities = <
  TData = Common.EntityTaggingServiceBatchTagEntitiesMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: BatchTagRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: BatchTagRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      EntityTaggingService.batchTagEntities({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useEntityTaggingServiceReTagEntities = <
  TData = Common.EntityTaggingServiceReTagEntitiesMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: ReTagRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: ReTagRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      EntityTaggingService.reTagEntities({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useEntityTaggingServiceProvideTaggingFeedback = <
  TData = Common.EntityTaggingServiceProvideTaggingFeedbackMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: TagFeedbackRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: TagFeedbackRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      EntityTaggingService.provideTaggingFeedback({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useTelegramServiceSendTelegramMessage = <
  TData = Common.TelegramServiceSendTelegramMessageMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: TelegramMessageRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: TelegramMessageRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      TelegramService.sendTelegramMessage({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useTelegramServiceSetTelegramWebhook = <
  TData = Common.TelegramServiceSetTelegramWebhookMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: TelegramWebhookRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: TelegramWebhookRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      TelegramService.setTelegramWebhook({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useIntegrationConfigServiceSetIntegrationConfig = <
  TData = Common.IntegrationConfigServiceSetIntegrationConfigMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: SetConfigRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: SetConfigRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      IntegrationConfigService.setIntegrationConfig({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useAiOperationsServiceAnalyzeDocumentAi = <
  TData = Common.AiOperationsServiceAnalyzeDocumentAiMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: DocumentAnalysisRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: DocumentAnalysisRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AiOperationsService.analyzeDocumentAi({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useAiOperationsServiceCategorizeTextAi = <
  TData = Common.AiOperationsServiceCategorizeTextAiMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: TextCategorizationRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: TextCategorizationRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AiOperationsService.categorizeTextAi({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useAiOperationsServiceExtractEntitiesAi = <
  TData = Common.AiOperationsServiceExtractEntitiesAiMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: EntityExtractionRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: EntityExtractionRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AiOperationsService.extractEntitiesAi({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useTagsServiceUpdateTag = <
  TData = Common.TagsServiceUpdateTagMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: UpdateTagRequest;
        tagId: string;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: UpdateTagRequest;
      tagId: string;
    },
    TContext
  >({
    mutationFn: ({ requestBody, tagId }) =>
      TagsService.updateTag({ requestBody, tagId }) as unknown as Promise<TData>,
    ...options,
  });
export const useEntityTaggingServiceUpdateEntityTag = <
  TData = Common.EntityTaggingServiceUpdateEntityTagMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        entityId: string;
        entityType: EntityType;
        requestBody: UpdateEntityTagRequest;
        tagId: string;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      entityId: string;
      entityType: EntityType;
      requestBody: UpdateEntityTagRequest;
      tagId: string;
    },
    TContext
  >({
    mutationFn: ({ entityId, entityType, requestBody, tagId }) =>
      EntityTaggingService.updateEntityTag({
        entityId,
        entityType,
        requestBody,
        tagId,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useTagsServiceDeleteTag = <
  TData = Common.TagsServiceDeleteTagMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody?: DeleteTagRequest;
        tagId: string;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody?: DeleteTagRequest;
      tagId: string;
    },
    TContext
  >({
    mutationFn: ({ requestBody, tagId }) =>
      TagsService.deleteTag({ requestBody, tagId }) as unknown as Promise<TData>,
    ...options,
  });
export const useEntityTaggingServiceRemoveEntityTag = <
  TData = Common.EntityTaggingServiceRemoveEntityTagMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        entityId: string;
        entityType: EntityType;
        tagId: string;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      entityId: string;
      entityType: EntityType;
      tagId: string;
    },
    TContext
  >({
    mutationFn: ({ entityId, entityType, tagId }) =>
      EntityTaggingService.removeEntityTag({
        entityId,
        entityType,
        tagId,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useIntegrationConfigServiceDeleteIntegrationConfig = <
  TData = Common.IntegrationConfigServiceDeleteIntegrationConfigMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        key: string;
        type: 'ai' | 'telegram' | 'notification' | 'integration';
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      key: string;
      type: 'ai' | 'telegram' | 'notification' | 'integration';
    },
    TContext
  >({
    mutationFn: ({ key, type }) =>
      IntegrationConfigService.deleteIntegrationConfig({ key, type }) as unknown as Promise<TData>,
    ...options,
  });
