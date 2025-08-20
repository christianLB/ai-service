// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { type QueryClient } from "@tanstack/react-query";
import { EntityTagsService, MetricsService, TagsService } from "../requests/services.gen";
import { EntityType } from "../requests/types.gen";
import * as Common from "./common";
export const ensureUseTagsServiceGetApiTagsData = (queryClient: QueryClient, { entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }: {
  entityType?: EntityType;
  isActive?: boolean;
  limit?: number;
  page?: number;
  parentId?: string;
  search?: string;
  sortBy?: "name" | "code" | "usageCount" | "createdAt";
  sortOrder?: "asc" | "desc";
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseTagsServiceGetApiTagsKeyFn({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }), queryFn: () => TagsService.getApiTags({ entityType, isActive, limit, page, parentId, search, sortBy, sortOrder }) });
export const ensureUseTagsServiceGetApiTagsSearchData = (queryClient: QueryClient, { entityType, limit, q }: {
  entityType?: EntityType;
  limit?: number;
  q: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseTagsServiceGetApiTagsSearchKeyFn({ entityType, limit, q }), queryFn: () => TagsService.getApiTagsSearch({ entityType, limit, q }) });
export const ensureUseTagsServiceGetApiTagsByIdData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseTagsServiceGetApiTagsByIdKeyFn({ id }), queryFn: () => TagsService.getApiTagsById({ id }) });
export const ensureUseEntityTagsServiceGetApiEntitiesByTypeByIdTagsData = (queryClient: QueryClient, { id, type }: {
  id: string;
  type: EntityType;
}) => queryClient.ensureQueryData({ queryKey: Common.UseEntityTagsServiceGetApiEntitiesByTypeByIdTagsKeyFn({ id, type }), queryFn: () => EntityTagsService.getApiEntitiesByTypeByIdTags({ id, type }) });
export const ensureUseMetricsServiceGetApiTaggingAccuracyData = (queryClient: QueryClient, { entityType, period }: {
  entityType?: EntityType;
  period?: "day" | "week" | "month" | "year";
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseMetricsServiceGetApiTaggingAccuracyKeyFn({ entityType, period }), queryFn: () => MetricsService.getApiTaggingAccuracy({ entityType, period }) });
