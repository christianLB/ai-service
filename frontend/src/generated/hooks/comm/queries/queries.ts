// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { AlertsService, EmailService, NotificationsService, TelegramService, WebSocketService } from "../requests/services.gen";
import { AlertPriority, AlertType, BroadcastWebSocketRequest, BulkDeleteAlertsRequest, CreateAlertRequest, CreateNotificationRequest, NotificationType, SendAlertRequest, SendInvoiceEmailRequest, SendReceiptRequest, SendReminderRequest, SendTelegramMessageRequest, SendWebSocketMessageRequest, SetupWebhookRequest, TelegramUpdate, UpdateAlertRequest } from "../requests/types.gen";
import * as Common from "./common";
export const useTelegramServiceGetTelegramStatus = <TData = Common.TelegramServiceGetTelegramStatusDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTelegramServiceGetTelegramStatusKeyFn(queryKey), queryFn: () => TelegramService.getTelegramStatus() as TData, ...options });
export const useEmailServiceGetEmailTemplates = <TData = Common.EmailServiceGetEmailTemplatesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ language }: {
  language?: "en" | "es";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseEmailServiceGetEmailTemplatesKeyFn({ language }, queryKey), queryFn: () => EmailService.getEmailTemplates({ language }) as TData, ...options });
export const useWebSocketServiceGetWebsocketConnectedUsers = <TData = Common.WebSocketServiceGetWebsocketConnectedUsersDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseWebSocketServiceGetWebsocketConnectedUsersKeyFn(queryKey), queryFn: () => WebSocketService.getWebsocketConnectedUsers() as TData, ...options });
export const useWebSocketServiceGetWebsocketUserStatusByUserId = <TData = Common.WebSocketServiceGetWebsocketUserStatusByUserIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ userId }: {
  userId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseWebSocketServiceGetWebsocketUserStatusByUserIdKeyFn({ userId }, queryKey), queryFn: () => WebSocketService.getWebsocketUserStatusByUserId({ userId }) as TData, ...options });
export const useAlertsServiceGetAlerts = <TData = Common.AlertsServiceGetAlertsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ acknowledged, limit, page, priority, type }: {
  acknowledged?: boolean;
  limit?: number;
  page?: number;
  priority?: AlertPriority;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsKeyFn({ acknowledged, limit, page, priority, type }, queryKey), queryFn: () => AlertsService.getAlerts({ acknowledged, limit, page, priority, type }) as TData, ...options });
export const useAlertsServiceGetAlertsById = <TData = Common.AlertsServiceGetAlertsByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsByIdKeyFn({ id }, queryKey), queryFn: () => AlertsService.getAlertsById({ id }) as TData, ...options });
export const useAlertsServiceGetAlertsSearch = <TData = Common.AlertsServiceGetAlertsSearchDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ from, limit, page, priority, query, to, type }: {
  from?: string;
  limit?: number;
  page?: number;
  priority?: AlertPriority;
  query?: string;
  to?: string;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsSearchKeyFn({ from, limit, page, priority, query, to, type }, queryKey), queryFn: () => AlertsService.getAlertsSearch({ from, limit, page, priority, query, to, type }) as TData, ...options });
export const useAlertsServiceGetAlertsActive = <TData = Common.AlertsServiceGetAlertsActiveDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, page, priority }: {
  limit?: number;
  page?: number;
  priority?: AlertPriority;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsActiveKeyFn({ limit, page, priority }, queryKey), queryFn: () => AlertsService.getAlertsActive({ limit, page, priority }) as TData, ...options });
export const useAlertsServiceGetAlertsHistory = <TData = Common.AlertsServiceGetAlertsHistoryDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ from, limit, page, to, type }: {
  from?: string;
  limit?: number;
  page?: number;
  to?: string;
  type?: AlertType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAlertsServiceGetAlertsHistoryKeyFn({ from, limit, page, to, type }, queryKey), queryFn: () => AlertsService.getAlertsHistory({ from, limit, page, to, type }) as TData, ...options });
export const useNotificationsServiceGetNotifications = <TData = Common.NotificationsServiceGetNotificationsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, page, read, type, userId }: {
  limit?: number;
  page?: number;
  read?: boolean;
  type?: NotificationType;
  userId?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseNotificationsServiceGetNotificationsKeyFn({ limit, page, read, type, userId }, queryKey), queryFn: () => NotificationsService.getNotifications({ limit, page, read, type, userId }) as TData, ...options });
export const useNotificationsServiceGetNotificationsById = <TData = Common.NotificationsServiceGetNotificationsByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseNotificationsServiceGetNotificationsByIdKeyFn({ id }, queryKey), queryFn: () => NotificationsService.getNotificationsById({ id }) as TData, ...options });
export const useTelegramServicePostTelegramWebhook = <TData = Common.TelegramServicePostTelegramWebhookMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: TelegramUpdate;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: TelegramUpdate;
}, TContext>({ mutationFn: ({ requestBody }) => TelegramService.postTelegramWebhook({ requestBody }) as unknown as Promise<TData>, ...options });
export const useTelegramServicePostTelegramSendMessage = <TData = Common.TelegramServicePostTelegramSendMessageMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: SendTelegramMessageRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: SendTelegramMessageRequest;
}, TContext>({ mutationFn: ({ requestBody }) => TelegramService.postTelegramSendMessage({ requestBody }) as unknown as Promise<TData>, ...options });
export const useTelegramServicePostTelegramSendAlert = <TData = Common.TelegramServicePostTelegramSendAlertMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: SendAlertRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: SendAlertRequest;
}, TContext>({ mutationFn: ({ requestBody }) => TelegramService.postTelegramSendAlert({ requestBody }) as unknown as Promise<TData>, ...options });
export const useTelegramServicePostTelegramSetupWebhook = <TData = Common.TelegramServicePostTelegramSetupWebhookMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: SetupWebhookRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: SetupWebhookRequest;
}, TContext>({ mutationFn: ({ requestBody }) => TelegramService.postTelegramSetupWebhook({ requestBody }) as unknown as Promise<TData>, ...options });
export const useEmailServicePostEmailSendInvoice = <TData = Common.EmailServicePostEmailSendInvoiceMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: SendInvoiceEmailRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: SendInvoiceEmailRequest;
}, TContext>({ mutationFn: ({ requestBody }) => EmailService.postEmailSendInvoice({ requestBody }) as unknown as Promise<TData>, ...options });
export const useEmailServicePostEmailSendReminder = <TData = Common.EmailServicePostEmailSendReminderMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: SendReminderRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: SendReminderRequest;
}, TContext>({ mutationFn: ({ requestBody }) => EmailService.postEmailSendReminder({ requestBody }) as unknown as Promise<TData>, ...options });
export const useEmailServicePostEmailSendReceipt = <TData = Common.EmailServicePostEmailSendReceiptMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: SendReceiptRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: SendReceiptRequest;
}, TContext>({ mutationFn: ({ requestBody }) => EmailService.postEmailSendReceipt({ requestBody }) as unknown as Promise<TData>, ...options });
export const useWebSocketServicePostWebsocketSendToUser = <TData = Common.WebSocketServicePostWebsocketSendToUserMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: SendWebSocketMessageRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: SendWebSocketMessageRequest;
}, TContext>({ mutationFn: ({ requestBody }) => WebSocketService.postWebsocketSendToUser({ requestBody }) as unknown as Promise<TData>, ...options });
export const useWebSocketServicePostWebsocketBroadcast = <TData = Common.WebSocketServicePostWebsocketBroadcastMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: BroadcastWebSocketRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: BroadcastWebSocketRequest;
}, TContext>({ mutationFn: ({ requestBody }) => WebSocketService.postWebsocketBroadcast({ requestBody }) as unknown as Promise<TData>, ...options });
export const useAlertsServicePostAlerts = <TData = Common.AlertsServicePostAlertsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreateAlertRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreateAlertRequest;
}, TContext>({ mutationFn: ({ requestBody }) => AlertsService.postAlerts({ requestBody }) as unknown as Promise<TData>, ...options });
export const useAlertsServicePostAlertsByAlertIdAcknowledge = <TData = Common.AlertsServicePostAlertsByAlertIdAcknowledgeMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  alertId: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  alertId: string;
}, TContext>({ mutationFn: ({ alertId }) => AlertsService.postAlertsByAlertIdAcknowledge({ alertId }) as unknown as Promise<TData>, ...options });
export const useNotificationsServicePostNotifications = <TData = Common.NotificationsServicePostNotificationsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreateNotificationRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreateNotificationRequest;
}, TContext>({ mutationFn: ({ requestBody }) => NotificationsService.postNotifications({ requestBody }) as unknown as Promise<TData>, ...options });
export const useAlertsServicePutAlertsById = <TData = Common.AlertsServicePutAlertsByIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: UpdateAlertRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: UpdateAlertRequest;
}, TContext>({ mutationFn: ({ id, requestBody }) => AlertsService.putAlertsById({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useNotificationsServicePutNotificationsByIdRead = <TData = Common.NotificationsServicePutNotificationsByIdReadMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => NotificationsService.putNotificationsByIdRead({ id }) as unknown as Promise<TData>, ...options });
export const useNotificationsServicePutNotificationsReadAll = <TData = Common.NotificationsServicePutNotificationsReadAllMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  userId?: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  userId?: string;
}, TContext>({ mutationFn: ({ userId }) => NotificationsService.putNotificationsReadAll({ userId }) as unknown as Promise<TData>, ...options });
export const useAlertsServiceDeleteAlertsById = <TData = Common.AlertsServiceDeleteAlertsByIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => AlertsService.deleteAlertsById({ id }) as unknown as Promise<TData>, ...options });
export const useAlertsServiceDeleteAlertsBulkDelete = <TData = Common.AlertsServiceDeleteAlertsBulkDeleteMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: BulkDeleteAlertsRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: BulkDeleteAlertsRequest;
}, TContext>({ mutationFn: ({ requestBody }) => AlertsService.deleteAlertsBulkDelete({ requestBody }) as unknown as Promise<TData>, ...options });
export const useNotificationsServiceDeleteNotificationsById = <TData = Common.NotificationsServiceDeleteNotificationsByIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => NotificationsService.deleteNotificationsById({ id }) as unknown as Promise<TData>, ...options });
