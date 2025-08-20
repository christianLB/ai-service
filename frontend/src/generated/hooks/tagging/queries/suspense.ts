// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { EntityTagsService, MetricsService, TagsService } from "../requests/services.gen";
import { EntityType } from "../requests/types.gen";
import * as Common from "./common";
export const useTagsServiceGetApiTagsSuspense = <TData = Common.TagsServiceGetApiTagsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }: {
  entityType?: EntityType;
  isActive?: boolean;
  limit?: number;
  page?: number;
  parentId?: string;
  search?: string;
  sortBy?: "name" | "code" | "usageCount" | "createdAt";
  sortOrder?: "asc" | "desc";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTagsServiceGetApiTagsKeyFn({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }, queryKey), queryFn: () => TagsService.getApiTags({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }) as TData, ...options });
export const useTagsServiceGetApiTagsSearchSuspense = <TData = Common.TagsServiceGetApiTagsSearchDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ entityType, limit, q }: {
  entityType?: EntityType;
  limit?: number;
  q: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTagsServiceGetApiTagsSearchKeyFn({ entityType, limit, q }, queryKey), queryFn: () => TagsService.getApiTagsSearch({ entityType, limit, q }) as TData, ...options });
export const useTagsServiceGetApiTagsByIdSuspense = <TData = Common.TagsServiceGetApiTagsByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTagsServiceGetApiTagsByIdKeyFn({ id }, queryKey), queryFn: () => TagsService.getApiTagsById({ id }) as TData, ...options });
export const useEntityTagsServiceGetApiEntitiesByTypeByIdTagsSuspense = <TData = Common.EntityTagsServiceGetApiEntitiesByTypeByIdTagsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id, type }: {
  id: string;
  type: EntityType;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseEntityTagsServiceGetApiEntitiesByTypeByIdTagsKeyFn({ id, type }, queryKey), queryFn: () => EntityTagsService.getApiEntitiesByTypeByIdTags({ id, type }) as TData, ...options });
export const useMetricsServiceGetApiTaggingAccuracySuspense = <TData = Common.MetricsServiceGetApiTaggingAccuracyDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ entityType, period }: {
  entityType?: EntityType;
  period?: "day" | "week" | "month" | "year";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseMetricsServiceGetApiTaggingAccuracyKeyFn({ entityType, period }, queryKey), queryFn: () => MetricsService.getApiTaggingAccuracy({ entityType, period }) as TData, ...options });
