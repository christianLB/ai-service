// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { BatchOperationsService, EntityTagsService, FeedbackService, MetricsService, TagsService } from "../requests/services.gen";
import { BatchTagRequest, CreateTag, EntityType, ReTagRequest, TagEntityRequest, TagFeedback, UpdateEntityTag, UpdateTag } from "../requests/types.gen";
import * as Common from "./common";
export const useTagsServiceGetApiTags = <TData = Common.TagsServiceGetApiTagsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }: {
  entityType?: EntityType;
  isActive?: boolean;
  limit?: number;
  page?: number;
  parentId?: string;
  search?: string;
  sortBy?: "name" | "code" | "usageCount" | "createdAt";
  sortOrder?: "asc" | "desc";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTagsServiceGetApiTagsKeyFn({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }, queryKey), queryFn: () => TagsService.getApiTags({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }) as TData, ...options });
export const useTagsServiceGetApiTagsSearch = <TData = Common.TagsServiceGetApiTagsSearchDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ entityType, limit, q }: {
  entityType?: EntityType;
  limit?: number;
  q: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTagsServiceGetApiTagsSearchKeyFn({ entityType, limit, q }, queryKey), queryFn: () => TagsService.getApiTagsSearch({ entityType, limit, q }) as TData, ...options });
export const useTagsServiceGetApiTagsById = <TData = Common.TagsServiceGetApiTagsByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTagsServiceGetApiTagsByIdKeyFn({ id }, queryKey), queryFn: () => TagsService.getApiTagsById({ id }) as TData, ...options });
export const useEntityTagsServiceGetApiEntitiesByTypeByIdTags = <TData = Common.EntityTagsServiceGetApiEntitiesByTypeByIdTagsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id, type }: {
  id: string;
  type: EntityType;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseEntityTagsServiceGetApiEntitiesByTypeByIdTagsKeyFn({ id, type }, queryKey), queryFn: () => EntityTagsService.getApiEntitiesByTypeByIdTags({ id, type }) as TData, ...options });
export const useMetricsServiceGetApiTaggingAccuracy = <TData = Common.MetricsServiceGetApiTaggingAccuracyDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ entityType, period }: {
  entityType?: EntityType;
  period?: "day" | "week" | "month" | "year";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseMetricsServiceGetApiTaggingAccuracyKeyFn({ entityType, period }, queryKey), queryFn: () => MetricsService.getApiTaggingAccuracy({ entityType, period }) as TData, ...options });
export const useTagsServicePostApiTags = <TData = Common.TagsServicePostApiTagsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreateTag;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreateTag;
}, TContext>({ mutationFn: ({ requestBody }) => TagsService.postApiTags({ requestBody }) as unknown as Promise<TData>, ...options });
export const useEntityTagsServicePostApiEntitiesByTypeByIdTags = <TData = Common.EntityTagsServicePostApiEntitiesByTypeByIdTagsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: TagEntityRequest;
  type: EntityType;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: TagEntityRequest;
  type: EntityType;
}, TContext>({ mutationFn: ({ id, requestBody, type }) => EntityTagsService.postApiEntitiesByTypeByIdTags({ id, requestBody, type }) as unknown as Promise<TData>, ...options });
export const useBatchOperationsServicePostApiTaggingBatch = <TData = Common.BatchOperationsServicePostApiTaggingBatchMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: BatchTagRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: BatchTagRequest;
}, TContext>({ mutationFn: ({ requestBody }) => BatchOperationsService.postApiTaggingBatch({ requestBody }) as unknown as Promise<TData>, ...options });
export const useBatchOperationsServicePostApiTaggingRetag = <TData = Common.BatchOperationsServicePostApiTaggingRetagMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: ReTagRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: ReTagRequest;
}, TContext>({ mutationFn: ({ requestBody }) => BatchOperationsService.postApiTaggingRetag({ requestBody }) as unknown as Promise<TData>, ...options });
export const useFeedbackServicePostApiTaggingFeedback = <TData = Common.FeedbackServicePostApiTaggingFeedbackMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: TagFeedback;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: TagFeedback;
}, TContext>({ mutationFn: ({ requestBody }) => FeedbackService.postApiTaggingFeedback({ requestBody }) as unknown as Promise<TData>, ...options });
export const useTagsServicePutApiTagsById = <TData = Common.TagsServicePutApiTagsByIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: UpdateTag;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: UpdateTag;
}, TContext>({ mutationFn: ({ id, requestBody }) => TagsService.putApiTagsById({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useEntityTagsServicePatchApiEntitiesByTypeByIdTagsByTagId = <TData = Common.EntityTagsServicePatchApiEntitiesByTypeByIdTagsByTagIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: UpdateEntityTag;
  tagId: string;
  type: EntityType;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: UpdateEntityTag;
  tagId: string;
  type: EntityType;
}, TContext>({ mutationFn: ({ id, requestBody, tagId, type }) => EntityTagsService.patchApiEntitiesByTypeByIdTagsByTagId({ id, requestBody, tagId, type }) as unknown as Promise<TData>, ...options });
export const useTagsServiceDeleteApiTagsById = <TData = Common.TagsServiceDeleteApiTagsByIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  reassignTo?: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  reassignTo?: string;
}, TContext>({ mutationFn: ({ id, reassignTo }) => TagsService.deleteApiTagsById({ id, reassignTo }) as unknown as Promise<TData>, ...options });
export const useEntityTagsServiceDeleteApiEntitiesByTypeByIdTagsByTagId = <TData = Common.EntityTagsServiceDeleteApiEntitiesByTypeByIdTagsByTagIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  tagId: string;
  type: EntityType;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  tagId: string;
  type: EntityType;
}, TContext>({ mutationFn: ({ id, tagId, type }) => EntityTagsService.deleteApiEntitiesByTypeByIdTagsByTagId({ id, tagId, type }) as unknown as Promise<TData>, ...options });
