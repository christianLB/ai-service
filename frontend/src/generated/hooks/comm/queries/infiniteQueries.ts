// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { InfiniteData, UseInfiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { AlertsService, NotificationsService } from "../requests/services.gen";
import { AlertPriority, AlertType, NotificationType } from "../requests/types.gen";
import * as Common from "./common";
export const useAlertsServiceGetAlertsInfinite = <TData = InfiniteData<Common.AlertsServiceGetAlertsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ acknowledged, limit, priority, type }: {
  acknowledged?: boolean;
  limit?: number;
  priority?: AlertPriority;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseAlertsServiceGetAlertsKeyFn({ acknowledged, limit, priority, type }, queryKey), queryFn: ({ pageParam }) => AlertsService.getAlerts({ acknowledged, limit, page: pageParam as number, priority, type }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useAlertsServiceGetAlertsSearchInfinite = <TData = InfiniteData<Common.AlertsServiceGetAlertsSearchDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ from, limit, priority, query, to, type }: {
  from?: string;
  limit?: number;
  priority?: AlertPriority;
  query?: string;
  to?: string;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseAlertsServiceGetAlertsSearchKeyFn({ from, limit, priority, query, to, type }, queryKey), queryFn: ({ pageParam }) => AlertsService.getAlertsSearch({ from, limit, page: pageParam as number, priority, query, to, type }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useAlertsServiceGetAlertsActiveInfinite = <TData = InfiniteData<Common.AlertsServiceGetAlertsActiveDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, priority }: {
  limit?: number;
  priority?: AlertPriority;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseAlertsServiceGetAlertsActiveKeyFn({ limit, priority }, queryKey), queryFn: ({ pageParam }) => AlertsService.getAlertsActive({ limit, page: pageParam as number, priority }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useAlertsServiceGetAlertsHistoryInfinite = <TData = InfiniteData<Common.AlertsServiceGetAlertsHistoryDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ from, limit, to, type }: {
  from?: string;
  limit?: number;
  to?: string;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseAlertsServiceGetAlertsHistoryKeyFn({ from, limit, to, type }, queryKey), queryFn: ({ pageParam }) => AlertsService.getAlertsHistory({ from, limit, page: pageParam as number, to, type }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useNotificationsServiceGetNotificationsInfinite = <TData = InfiniteData<Common.NotificationsServiceGetNotificationsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, read, type, userId }: {
  limit?: number;
  read?: boolean;
  type?: NotificationType;
  userId?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseNotificationsServiceGetNotificationsKeyFn({ limit, read, type, userId }, queryKey), queryFn: ({ pageParam }) => NotificationsService.getNotifications({ limit, page: pageParam as number, read, type, userId }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
