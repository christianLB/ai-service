// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryResult } from "@tanstack/react-query";
import { AlertsService, EmailService, NotificationsService, TelegramService, WebSocketService } from "../requests/services.gen";
import { AlertPriority, AlertType, NotificationType } from "../requests/types.gen";
export type TelegramServiceGetTelegramStatusDefaultResponse = Awaited<ReturnType<typeof TelegramService.getTelegramStatus>>;
export type TelegramServiceGetTelegramStatusQueryResult<TData = TelegramServiceGetTelegramStatusDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTelegramServiceGetTelegramStatusKey = "TelegramServiceGetTelegramStatus";
export const UseTelegramServiceGetTelegramStatusKeyFn = (queryKey?: Array<unknown>) => [useTelegramServiceGetTelegramStatusKey, ...(queryKey ?? [])];
export type EmailServiceGetEmailTemplatesDefaultResponse = Awaited<ReturnType<typeof EmailService.getEmailTemplates>>;
export type EmailServiceGetEmailTemplatesQueryResult<TData = EmailServiceGetEmailTemplatesDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useEmailServiceGetEmailTemplatesKey = "EmailServiceGetEmailTemplates";
export const UseEmailServiceGetEmailTemplatesKeyFn = ({ language }: {
  language?: "en" | "es";
} = {}, queryKey?: Array<unknown>) => [useEmailServiceGetEmailTemplatesKey, ...(queryKey ?? [{ language }])];
export type WebSocketServiceGetWebsocketConnectedUsersDefaultResponse = Awaited<ReturnType<typeof WebSocketService.getWebsocketConnectedUsers>>;
export type WebSocketServiceGetWebsocketConnectedUsersQueryResult<TData = WebSocketServiceGetWebsocketConnectedUsersDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useWebSocketServiceGetWebsocketConnectedUsersKey = "WebSocketServiceGetWebsocketConnectedUsers";
export const UseWebSocketServiceGetWebsocketConnectedUsersKeyFn = (queryKey?: Array<unknown>) => [useWebSocketServiceGetWebsocketConnectedUsersKey, ...(queryKey ?? [])];
export type WebSocketServiceGetWebsocketUserStatusByUserIdDefaultResponse = Awaited<ReturnType<typeof WebSocketService.getWebsocketUserStatusByUserId>>;
export type WebSocketServiceGetWebsocketUserStatusByUserIdQueryResult<TData = WebSocketServiceGetWebsocketUserStatusByUserIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useWebSocketServiceGetWebsocketUserStatusByUserIdKey = "WebSocketServiceGetWebsocketUserStatusByUserId";
export const UseWebSocketServiceGetWebsocketUserStatusByUserIdKeyFn = ({ userId }: {
  userId: string;
}, queryKey?: Array<unknown>) => [useWebSocketServiceGetWebsocketUserStatusByUserIdKey, ...(queryKey ?? [{ userId }])];
export type AlertsServiceGetAlertsDefaultResponse = Awaited<ReturnType<typeof AlertsService.getAlerts>>;
export type AlertsServiceGetAlertsQueryResult<TData = AlertsServiceGetAlertsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useAlertsServiceGetAlertsKey = "AlertsServiceGetAlerts";
export const UseAlertsServiceGetAlertsKeyFn = ({ acknowledged, limit, page, priority, type }: {
  acknowledged?: boolean;
  limit?: number;
  page?: number;
  priority?: AlertPriority;
  type?: AlertType;
} = {}, queryKey?: Array<unknown>) => [useAlertsServiceGetAlertsKey, ...(queryKey ?? [{ acknowledged, limit, page, priority, type }])];
export type AlertsServiceGetAlertsByIdDefaultResponse = Awaited<ReturnType<typeof AlertsService.getAlertsById>>;
export type AlertsServiceGetAlertsByIdQueryResult<TData = AlertsServiceGetAlertsByIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useAlertsServiceGetAlertsByIdKey = "AlertsServiceGetAlertsById";
export const UseAlertsServiceGetAlertsByIdKeyFn = ({ id }: {
  id: string;
}, queryKey?: Array<unknown>) => [useAlertsServiceGetAlertsByIdKey, ...(queryKey ?? [{ id }])];
export type AlertsServiceGetAlertsSearchDefaultResponse = Awaited<ReturnType<typeof AlertsService.getAlertsSearch>>;
export type AlertsServiceGetAlertsSearchQueryResult<TData = AlertsServiceGetAlertsSearchDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useAlertsServiceGetAlertsSearchKey = "AlertsServiceGetAlertsSearch";
export const UseAlertsServiceGetAlertsSearchKeyFn = ({ from, limit, page, priority, query, to, type }: {
  from?: string;
  limit?: number;
  page?: number;
  priority?: AlertPriority;
  query?: string;
  to?: string;
  type?: AlertType;
} = {}, queryKey?: Array<unknown>) => [useAlertsServiceGetAlertsSearchKey, ...(queryKey ?? [{ from, limit, page, priority, query, to, type }])];
export type AlertsServiceGetAlertsActiveDefaultResponse = Awaited<ReturnType<typeof AlertsService.getAlertsActive>>;
export type AlertsServiceGetAlertsActiveQueryResult<TData = AlertsServiceGetAlertsActiveDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useAlertsServiceGetAlertsActiveKey = "AlertsServiceGetAlertsActive";
export const UseAlertsServiceGetAlertsActiveKeyFn = ({ limit, page, priority }: {
  limit?: number;
  page?: number;
  priority?: AlertPriority;
} = {}, queryKey?: Array<unknown>) => [useAlertsServiceGetAlertsActiveKey, ...(queryKey ?? [{ limit, page, priority }])];
export type AlertsServiceGetAlertsHistoryDefaultResponse = Awaited<ReturnType<typeof AlertsService.getAlertsHistory>>;
export type AlertsServiceGetAlertsHistoryQueryResult<TData = AlertsServiceGetAlertsHistoryDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useAlertsServiceGetAlertsHistoryKey = "AlertsServiceGetAlertsHistory";
export const UseAlertsServiceGetAlertsHistoryKeyFn = ({ from, limit, page, to, type }: {
  from?: string;
  limit?: number;
  page?: number;
  to?: string;
  type?: AlertType;
} = {}, queryKey?: Array<unknown>) => [useAlertsServiceGetAlertsHistoryKey, ...(queryKey ?? [{ from, limit, page, to, type }])];
export type NotificationsServiceGetNotificationsDefaultResponse = Awaited<ReturnType<typeof NotificationsService.getNotifications>>;
export type NotificationsServiceGetNotificationsQueryResult<TData = NotificationsServiceGetNotificationsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useNotificationsServiceGetNotificationsKey = "NotificationsServiceGetNotifications";
export const UseNotificationsServiceGetNotificationsKeyFn = ({ limit, page, read, type, userId }: {
  limit?: number;
  page?: number;
  read?: boolean;
  type?: NotificationType;
  userId?: string;
} = {}, queryKey?: Array<unknown>) => [useNotificationsServiceGetNotificationsKey, ...(queryKey ?? [{ limit, page, read, type, userId }])];
export type NotificationsServiceGetNotificationsByIdDefaultResponse = Awaited<ReturnType<typeof NotificationsService.getNotificationsById>>;
export type NotificationsServiceGetNotificationsByIdQueryResult<TData = NotificationsServiceGetNotificationsByIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useNotificationsServiceGetNotificationsByIdKey = "NotificationsServiceGetNotificationsById";
export const UseNotificationsServiceGetNotificationsByIdKeyFn = ({ id }: {
  id: string;
}, queryKey?: Array<unknown>) => [useNotificationsServiceGetNotificationsByIdKey, ...(queryKey ?? [{ id }])];
export type TelegramServicePostTelegramWebhookMutationResult = Awaited<ReturnType<typeof TelegramService.postTelegramWebhook>>;
export type TelegramServicePostTelegramSendMessageMutationResult = Awaited<ReturnType<typeof TelegramService.postTelegramSendMessage>>;
export type TelegramServicePostTelegramSendAlertMutationResult = Awaited<ReturnType<typeof TelegramService.postTelegramSendAlert>>;
export type TelegramServicePostTelegramSetupWebhookMutationResult = Awaited<ReturnType<typeof TelegramService.postTelegramSetupWebhook>>;
export type EmailServicePostEmailSendInvoiceMutationResult = Awaited<ReturnType<typeof EmailService.postEmailSendInvoice>>;
export type EmailServicePostEmailSendReminderMutationResult = Awaited<ReturnType<typeof EmailService.postEmailSendReminder>>;
export type EmailServicePostEmailSendReceiptMutationResult = Awaited<ReturnType<typeof EmailService.postEmailSendReceipt>>;
export type WebSocketServicePostWebsocketSendToUserMutationResult = Awaited<ReturnType<typeof WebSocketService.postWebsocketSendToUser>>;
export type WebSocketServicePostWebsocketBroadcastMutationResult = Awaited<ReturnType<typeof WebSocketService.postWebsocketBroadcast>>;
export type AlertsServicePostAlertsMutationResult = Awaited<ReturnType<typeof AlertsService.postAlerts>>;
export type AlertsServicePostAlertsByAlertIdAcknowledgeMutationResult = Awaited<ReturnType<typeof AlertsService.postAlertsByAlertIdAcknowledge>>;
export type NotificationsServicePostNotificationsMutationResult = Awaited<ReturnType<typeof NotificationsService.postNotifications>>;
export type AlertsServicePutAlertsByIdMutationResult = Awaited<ReturnType<typeof AlertsService.putAlertsById>>;
export type NotificationsServicePutNotificationsByIdReadMutationResult = Awaited<ReturnType<typeof NotificationsService.putNotificationsByIdRead>>;
export type NotificationsServicePutNotificationsReadAllMutationResult = Awaited<ReturnType<typeof NotificationsService.putNotificationsReadAll>>;
export type AlertsServiceDeleteAlertsByIdMutationResult = Awaited<ReturnType<typeof AlertsService.deleteAlertsById>>;
export type AlertsServiceDeleteAlertsBulkDeleteMutationResult = Awaited<ReturnType<typeof AlertsService.deleteAlertsBulkDelete>>;
export type NotificationsServiceDeleteNotificationsByIdMutationResult = Awaited<ReturnType<typeof NotificationsService.deleteNotificationsById>>;
