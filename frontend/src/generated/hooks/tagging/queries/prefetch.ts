// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { type QueryClient } from "@tanstack/react-query";
import { EntityTagsService, MetricsService, TagsService } from "../requests/services.gen";
import { EntityType } from "../requests/types.gen";
import * as Common from "./common";
export const prefetchUseTagsServiceGetApiTags = (queryClient: QueryClient, { entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }: {
  entityType?: EntityType;
  isActive?: boolean;
  limit?: number;
  page?: number;
  parentId?: string;
  search?: string;
  sortBy?: "name" | "code" | "usageCount" | "createdAt";
  sortOrder?: "asc" | "desc";
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseTagsServiceGetApiTagsKeyFn({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }), queryFn: () => TagsService.getApiTags({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }) });
export const prefetchUseTagsServiceGetApiTagsSearch = (queryClient: QueryClient, { entityType, limit, q }: {
  entityType?: EntityType;
  limit?: number;
  q: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseTagsServiceGetApiTagsSearchKeyFn({ entityType, limit, q }), queryFn: () => TagsService.getApiTagsSearch({ entityType, limit, q }) });
export const prefetchUseTagsServiceGetApiTagsById = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseTagsServiceGetApiTagsByIdKeyFn({ id }), queryFn: () => TagsService.getApiTagsById({ id }) });
export const prefetchUseEntityTagsServiceGetApiEntitiesByTypeByIdTags = (queryClient: QueryClient, { id, type }: {
  id: string;
  type: EntityType;
}) => queryClient.prefetchQuery({ queryKey: Common.UseEntityTagsServiceGetApiEntitiesByTypeByIdTagsKeyFn({ id, type }), queryFn: () => EntityTagsService.getApiEntitiesByTypeByIdTags({ id, type }) });
export const prefetchUseMetricsServiceGetApiTaggingAccuracy = (queryClient: QueryClient, { entityType, period }: {
  entityType?: EntityType;
  period?: "day" | "week" | "month" | "year";
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseMetricsServiceGetApiTaggingAccuracyKeyFn({ entityType, period }), queryFn: () => MetricsService.getApiTaggingAccuracy({ entityType, period }) });
