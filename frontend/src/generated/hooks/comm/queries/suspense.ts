// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AlertsService, EmailService, NotificationsService, TelegramService, WebSocketService } from "../requests/services.gen";
import { AlertPriority, AlertType, NotificationType } from "../requests/types.gen";
import * as Common from "./common";
export const useTelegramServiceGetTelegramStatusSuspense = <TData = Common.TelegramServiceGetTelegramStatusDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTelegramServiceGetTelegramStatusKeyFn(queryKey), queryFn: () => TelegramService.getTelegramStatus() as TData, ...options });
export const useEmailServiceGetEmailTemplatesSuspense = <TData = Common.EmailServiceGetEmailTemplatesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ language }: {
  language?: "en" | "es";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseEmailServiceGetEmailTemplatesKeyFn({ language }, queryKey), queryFn: () => EmailService.getEmailTemplates({ language }) as TData, ...options });
export const useWebSocketServiceGetWebsocketConnectedUsersSuspense = <TData = Common.WebSocketServiceGetWebsocketConnectedUsersDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseWebSocketServiceGetWebsocketConnectedUsersKeyFn(queryKey), queryFn: () => WebSocketService.getWebsocketConnectedUsers() as TData, ...options });
export const useWebSocketServiceGetWebsocketUserStatusByUserIdSuspense = <TData = Common.WebSocketServiceGetWebsocketUserStatusByUserIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ userId }: {
  userId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseWebSocketServiceGetWebsocketUserStatusByUserIdKeyFn({ userId }, queryKey), queryFn: () => WebSocketService.getWebsocketUserStatusByUserId({ userId }) as TData, ...options });
export const useAlertsServiceGetAlertsSuspense = <TData = Common.AlertsServiceGetAlertsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ acknowledged, limit, page, priority, type }: {
  acknowledged?: boolean;
  limit?: number;
  page?: number;
  priority?: AlertPriority;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsKeyFn({ acknowledged, limit, page, priority, type }, queryKey), queryFn: () => AlertsService.getAlerts({ acknowledged, limit, page, priority, type }) as TData, ...options });
export const useAlertsServiceGetAlertsByIdSuspense = <TData = Common.AlertsServiceGetAlertsByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsByIdKeyFn({ id }, queryKey), queryFn: () => AlertsService.getAlertsById({ id }) as TData, ...options });
export const useAlertsServiceGetAlertsSearchSuspense = <TData = Common.AlertsServiceGetAlertsSearchDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ from, limit, page, priority, query, to, type }: {
  from?: string;
  limit?: number;
  page?: number;
  priority?: AlertPriority;
  query?: string;
  to?: string;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsSearchKeyFn({ from, limit, page, priority, query, to, type }, queryKey), queryFn: () => AlertsService.getAlertsSearch({ from, limit, page, priority, query, to, type }) as TData, ...options });
export const useAlertsServiceGetAlertsActiveSuspense = <TData = Common.AlertsServiceGetAlertsActiveDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, page, priority }: {
  limit?: number;
  page?: number;
  priority?: AlertPriority;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsActiveKeyFn({ limit, page, priority }, queryKey), queryFn: () => AlertsService.getAlertsActive({ limit, page, priority }) as TData, ...options });
export const useAlertsServiceGetAlertsHistorySuspense = <TData = Common.AlertsServiceGetAlertsHistoryDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ from, limit, page, to, type }: {
  from?: string;
  limit?: number;
  page?: number;
  to?: string;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsHistoryKeyFn({ from, limit, page, to, type }, queryKey), queryFn: () => AlertsService.getAlertsHistory({ from, limit, page, to, type }) as TData, ...options });
export const useNotificationsServiceGetNotificationsSuspense = <TData = Common.NotificationsServiceGetNotificationsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, page, read, type, userId }: {
  limit?: number;
  page?: number;
  read?: boolean;
  type?: NotificationType;
  userId?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseNotificationsServiceGetNotificationsKeyFn({ limit, page, read, type, userId }, queryKey), queryFn: () => NotificationsService.getNotifications({ limit, page, read, type, userId }) as TData, ...options });
export const useNotificationsServiceGetNotificationsByIdSuspense = <TData = Common.NotificationsServiceGetNotificationsByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseNotificationsServiceGetNotificationsByIdKeyFn({ id }, queryKey), queryFn: () => NotificationsService.getNotificationsById({ id }) as TData, ...options });
