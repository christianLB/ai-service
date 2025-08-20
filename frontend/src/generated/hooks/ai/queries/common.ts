// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryResult } from "@tanstack/react-query";
import { AiOperationsService, EntityTaggingService, IntegrationConfigService, TagsService, TelegramService } from "../requests/services.gen";
import { EntityType } from "../requests/types.gen";
export type TagsServiceListTagsDefaultResponse = Awaited<ReturnType<typeof TagsService.listTags>>;
export type TagsServiceListTagsQueryResult<TData = TagsServiceListTagsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTagsServiceListTagsKey = "TagsServiceListTags";
export const UseTagsServiceListTagsKeyFn = ({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }: {
  entityType?: EntityType;
  isActive?: boolean;
  limit?: number;
  page?: number;
  parentId?: string;
  search?: string;
  sortBy?: "name" | "code" | "usageCount" | "createdAt";
  sortOrder?: "asc" | "desc";
} = {}, queryKey?: Array<unknown>) => [useTagsServiceListTagsKey, ...(queryKey ?? [{ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }])];
export type TagsServiceGetTagDefaultResponse = Awaited<ReturnType<typeof TagsService.getTag>>;
export type TagsServiceGetTagQueryResult<TData = TagsServiceGetTagDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTagsServiceGetTagKey = "TagsServiceGetTag";
export const UseTagsServiceGetTagKeyFn = ({ tagId }: {
  tagId: string;
}, queryKey?: Array<unknown>) => [useTagsServiceGetTagKey, ...(queryKey ?? [{ tagId }])];
export type EntityTaggingServiceGetEntityTagsDefaultResponse = Awaited<ReturnType<typeof EntityTaggingService.getEntityTags>>;
export type EntityTaggingServiceGetEntityTagsQueryResult<TData = EntityTaggingServiceGetEntityTagsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useEntityTaggingServiceGetEntityTagsKey = "EntityTaggingServiceGetEntityTags";
export const UseEntityTaggingServiceGetEntityTagsKeyFn = ({ entityId, entityType }: {
  entityId: string;
  entityType: EntityType;
}, queryKey?: Array<unknown>) => [useEntityTaggingServiceGetEntityTagsKey, ...(queryKey ?? [{ entityId, entityType }])];
export type EntityTaggingServiceFindEntitiesByTagDefaultResponse = Awaited<ReturnType<typeof EntityTaggingService.findEntitiesByTag>>;
export type EntityTaggingServiceFindEntitiesByTagQueryResult<TData = EntityTaggingServiceFindEntitiesByTagDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useEntityTaggingServiceFindEntitiesByTagKey = "EntityTaggingServiceFindEntitiesByTag";
export const UseEntityTaggingServiceFindEntitiesByTagKeyFn = ({ entityType, limit, minConfidence, page, tagId }: {
  entityType?: EntityType;
  limit?: number;
  minConfidence?: number;
  page?: number;
  tagId: string;
}, queryKey?: Array<unknown>) => [useEntityTaggingServiceFindEntitiesByTagKey, ...(queryKey ?? [{ entityType, limit, minConfidence, page, tagId }])];
export type EntityTaggingServiceGetTaggingLearningStatsDefaultResponse = Awaited<ReturnType<typeof EntityTaggingService.getTaggingLearningStats>>;
export type EntityTaggingServiceGetTaggingLearningStatsQueryResult<TData = EntityTaggingServiceGetTaggingLearningStatsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useEntityTaggingServiceGetTaggingLearningStatsKey = "EntityTaggingServiceGetTaggingLearningStats";
export const UseEntityTaggingServiceGetTaggingLearningStatsKeyFn = (queryKey?: Array<unknown>) => [useEntityTaggingServiceGetTaggingLearningStatsKey, ...(queryKey ?? [])];
export type TelegramServiceGetTelegramChatInfoDefaultResponse = Awaited<ReturnType<typeof TelegramService.getTelegramChatInfo>>;
export type TelegramServiceGetTelegramChatInfoQueryResult<TData = TelegramServiceGetTelegramChatInfoDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTelegramServiceGetTelegramChatInfoKey = "TelegramServiceGetTelegramChatInfo";
export const UseTelegramServiceGetTelegramChatInfoKeyFn = ({ chatId }: {
  chatId: string;
}, queryKey?: Array<unknown>) => [useTelegramServiceGetTelegramChatInfoKey, ...(queryKey ?? [{ chatId }])];
export type IntegrationConfigServiceListConfigsByTypeDefaultResponse = Awaited<ReturnType<typeof IntegrationConfigService.listConfigsByType>>;
export type IntegrationConfigServiceListConfigsByTypeQueryResult<TData = IntegrationConfigServiceListConfigsByTypeDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useIntegrationConfigServiceListConfigsByTypeKey = "IntegrationConfigServiceListConfigsByType";
export const UseIntegrationConfigServiceListConfigsByTypeKeyFn = ({ type }: {
  type: "ai" | "telegram" | "notification" | "integration";
}, queryKey?: Array<unknown>) => [useIntegrationConfigServiceListConfigsByTypeKey, ...(queryKey ?? [{ type }])];
export type IntegrationConfigServiceGetIntegrationConfigDefaultResponse = Awaited<ReturnType<typeof IntegrationConfigService.getIntegrationConfig>>;
export type IntegrationConfigServiceGetIntegrationConfigQueryResult<TData = IntegrationConfigServiceGetIntegrationConfigDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useIntegrationConfigServiceGetIntegrationConfigKey = "IntegrationConfigServiceGetIntegrationConfig";
export const UseIntegrationConfigServiceGetIntegrationConfigKeyFn = ({ key, type }: {
  key: string;
  type: "ai" | "telegram" | "notification" | "integration";
}, queryKey?: Array<unknown>) => [useIntegrationConfigServiceGetIntegrationConfigKey, ...(queryKey ?? [{ key, type }])];
export type TagsServiceCreateTagMutationResult = Awaited<ReturnType<typeof TagsService.createTag>>;
export type TagsServiceSearchTagsMutationResult = Awaited<ReturnType<typeof TagsService.searchTags>>;
export type EntityTaggingServiceTagEntityMutationResult = Awaited<ReturnType<typeof EntityTaggingService.tagEntity>>;
export type EntityTaggingServiceBatchTagEntitiesMutationResult = Awaited<ReturnType<typeof EntityTaggingService.batchTagEntities>>;
export type EntityTaggingServiceReTagEntitiesMutationResult = Awaited<ReturnType<typeof EntityTaggingService.reTagEntities>>;
export type EntityTaggingServiceProvideTaggingFeedbackMutationResult = Awaited<ReturnType<typeof EntityTaggingService.provideTaggingFeedback>>;
export type TelegramServiceSendTelegramMessageMutationResult = Awaited<ReturnType<typeof TelegramService.sendTelegramMessage>>;
export type TelegramServiceSetTelegramWebhookMutationResult = Awaited<ReturnType<typeof TelegramService.setTelegramWebhook>>;
export type IntegrationConfigServiceSetIntegrationConfigMutationResult = Awaited<ReturnType<typeof IntegrationConfigService.setIntegrationConfig>>;
export type AiOperationsServiceAnalyzeDocumentAiMutationResult = Awaited<ReturnType<typeof AiOperationsService.analyzeDocumentAi>>;
export type AiOperationsServiceCategorizeTextAiMutationResult = Awaited<ReturnType<typeof AiOperationsService.categorizeTextAi>>;
export type AiOperationsServiceExtractEntitiesAiMutationResult = Awaited<ReturnType<typeof AiOperationsService.extractEntitiesAi>>;
export type TagsServiceUpdateTagMutationResult = Awaited<ReturnType<typeof TagsService.updateTag>>;
export type EntityTaggingServiceUpdateEntityTagMutationResult = Awaited<ReturnType<typeof EntityTaggingService.updateEntityTag>>;
export type TagsServiceDeleteTagMutationResult = Awaited<ReturnType<typeof TagsService.deleteTag>>;
export type EntityTaggingServiceRemoveEntityTagMutationResult = Awaited<ReturnType<typeof EntityTaggingService.removeEntityTag>>;
export type IntegrationConfigServiceDeleteIntegrationConfigMutationResult = Awaited<ReturnType<typeof IntegrationConfigService.deleteIntegrationConfig>>;
