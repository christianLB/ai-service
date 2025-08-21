// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { InfiniteData, UseInfiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { TagsService } from "../requests/services.gen";
import { EntityType } from "../requests/types.gen";
import * as Common from "./common";
export const useTagsServiceGetApiTagsInfinite = <TData = InfiniteData<Common.TagsServiceGetApiTagsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ entityType, isActive, limit, parentId, search, sortBy, sortOrder }: {
  entityType?: EntityType;
  isActive?: boolean;
  limit?: number;
  parentId?: string;
  search?: string;
  sortBy?: "name" | "code" | "usageCount" | "createdAt";
  sortOrder?: "asc" | "desc";
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseTagsServiceGetApiTagsKeyFn({ entityType, isActive, limit, parentId, search, sortBy, sortOrder }, queryKey), queryFn: ({ pageParam }) => TagsService.getApiTags({ entityType, isActive, limit, page: pageParam as number, parentId, search, sortBy, sortOrder }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
