// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryResult } from "@tanstack/react-query";
import { BatchOperationsService, EntityTagsService, FeedbackService, MetricsService, TagsService } from "../requests/services.gen";
import { EntityType } from "../requests/types.gen";
export type TagsServiceGetApiTagsDefaultResponse = Awaited<ReturnType<typeof TagsService.getApiTags>>;
export type TagsServiceGetApiTagsQueryResult<TData = TagsServiceGetApiTagsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTagsServiceGetApiTagsKey = "TagsServiceGetApiTags";
export const UseTagsServiceGetApiTagsKeyFn = ({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }: {
  entityType?: EntityType;
  isActive?: boolean;
  limit?: number;
  page?: number;
  parentId?: string;
  search?: string;
  sortBy?: "name" | "code" | "usageCount" | "createdAt";
  sortOrder?: "asc" | "desc";
} = {}, queryKey?: Array<unknown>) => [useTagsServiceGetApiTagsKey, ...(queryKey ?? [{ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }])];
export type TagsServiceGetApiTagsSearchDefaultResponse = Awaited<ReturnType<typeof TagsService.getApiTagsSearch>>;
export type TagsServiceGetApiTagsSearchQueryResult<TData = TagsServiceGetApiTagsSearchDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTagsServiceGetApiTagsSearchKey = "TagsServiceGetApiTagsSearch";
export const UseTagsServiceGetApiTagsSearchKeyFn = ({ entityType, limit, q }: {
  entityType?: EntityType;
  limit?: number;
  q: string;
}, queryKey?: Array<unknown>) => [useTagsServiceGetApiTagsSearchKey, ...(queryKey ?? [{ entityType, limit, q }])];
export type TagsServiceGetApiTagsByIdDefaultResponse = Awaited<ReturnType<typeof TagsService.getApiTagsById>>;
export type TagsServiceGetApiTagsByIdQueryResult<TData = TagsServiceGetApiTagsByIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTagsServiceGetApiTagsByIdKey = "TagsServiceGetApiTagsById";
export const UseTagsServiceGetApiTagsByIdKeyFn = ({ id }: {
  id: string;
}, queryKey?: Array<unknown>) => [useTagsServiceGetApiTagsByIdKey, ...(queryKey ?? [{ id }])];
export type EntityTagsServiceGetApiEntitiesByTypeByIdTagsDefaultResponse = Awaited<ReturnType<typeof EntityTagsService.getApiEntitiesByTypeByIdTags>>;
export type EntityTagsServiceGetApiEntitiesByTypeByIdTagsQueryResult<TData = EntityTagsServiceGetApiEntitiesByTypeByIdTagsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useEntityTagsServiceGetApiEntitiesByTypeByIdTagsKey = "EntityTagsServiceGetApiEntitiesByTypeByIdTags";
export const UseEntityTagsServiceGetApiEntitiesByTypeByIdTagsKeyFn = ({ id, type }: {
  id: string;
  type: EntityType;
}, queryKey?: Array<unknown>) => [useEntityTagsServiceGetApiEntitiesByTypeByIdTagsKey, ...(queryKey ?? [{ id, type }])];
export type MetricsServiceGetApiTaggingAccuracyDefaultResponse = Awaited<ReturnType<typeof MetricsService.getApiTaggingAccuracy>>;
export type MetricsServiceGetApiTaggingAccuracyQueryResult<TData = MetricsServiceGetApiTaggingAccuracyDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useMetricsServiceGetApiTaggingAccuracyKey = "MetricsServiceGetApiTaggingAccuracy";
export const UseMetricsServiceGetApiTaggingAccuracyKeyFn = ({ entityType, period }: {
  entityType?: EntityType;
  period?: "day" | "week" | "month" | "year";
} = {}, queryKey?: Array<unknown>) => [useMetricsServiceGetApiTaggingAccuracyKey, ...(queryKey ?? [{ entityType, period }])];
export type TagsServicePostApiTagsMutationResult = Awaited<ReturnType<typeof TagsService.postApiTags>>;
export type EntityTagsServicePostApiEntitiesByTypeByIdTagsMutationResult = Awaited<ReturnType<typeof EntityTagsService.postApiEntitiesByTypeByIdTags>>;
export type BatchOperationsServicePostApiTaggingBatchMutationResult = Awaited<ReturnType<typeof BatchOperationsService.postApiTaggingBatch>>;
export type BatchOperationsServicePostApiTaggingRetagMutationResult = Awaited<ReturnType<typeof BatchOperationsService.postApiTaggingRetag>>;
export type FeedbackServicePostApiTaggingFeedbackMutationResult = Awaited<ReturnType<typeof FeedbackService.postApiTaggingFeedback>>;
export type TagsServicePutApiTagsByIdMutationResult = Awaited<ReturnType<typeof TagsService.putApiTagsById>>;
export type EntityTagsServicePatchApiEntitiesByTypeByIdTagsByTagIdMutationResult = Awaited<ReturnType<typeof EntityTagsService.patchApiEntitiesByTypeByIdTagsByTagId>>;
export type TagsServiceDeleteApiTagsByIdMutationResult = Awaited<ReturnType<typeof TagsService.deleteApiTagsById>>;
export type EntityTagsServiceDeleteApiEntitiesByTypeByIdTagsByTagIdMutationResult = Awaited<ReturnType<typeof EntityTagsService.deleteApiEntitiesByTypeByIdTagsByTagId>>;
