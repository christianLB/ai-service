// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { type QueryClient } from "@tanstack/react-query";
import { AlertsService, EmailService, NotificationsService, TelegramService, WebSocketService } from "../requests/services.gen";
import { AlertPriority, AlertType, NotificationType } from "../requests/types.gen";
import * as Common from "./common";
export const ensureUseTelegramServiceGetTelegramStatusData = (queryClient: QueryClient) => queryClient.ensureQueryData({ queryKey: Common.UseTelegramServiceGetTelegramStatusKeyFn(), queryFn: () => TelegramService.getTelegramStatus() });
export const ensureUseEmailServiceGetEmailTemplatesData = (queryClient: QueryClient, { language }: {
  language?: "en" | "es";
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseEmailServiceGetEmailTemplatesKeyFn({ language }), queryFn: () => EmailService.getEmailTemplates({ language }) });
export const ensureUseWebSocketServiceGetWebsocketConnectedUsersData = (queryClient: QueryClient) => queryClient.ensureQueryData({ queryKey: Common.UseWebSocketServiceGetWebsocketConnectedUsersKeyFn(), queryFn: () => WebSocketService.getWebsocketConnectedUsers() });
export const ensureUseWebSocketServiceGetWebsocketUserStatusByUserIdData = (queryClient: QueryClient, { userId }: {
  userId: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseWebSocketServiceGetWebsocketUserStatusByUserIdKeyFn({ userId }), queryFn: () => WebSocketService.getWebsocketUserStatusByUserId({ userId }) });
export const ensureUseAlertsServiceGetAlertsData = (queryClient: QueryClient, { acknowledged, limit, page, priority, type }: {
  acknowledged?: boolean;
  limit?: number;
  page?: number;
  priority?: AlertPriority;
  type?: AlertType;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseAlertsServiceGetAlertsKeyFn({ acknowledged, limit, page, priority, type }), queryFn: () => AlertsService.getAlerts({ acknowledged, limit, page, priority, type }) });
export const ensureUseAlertsServiceGetAlertsByIdData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseAlertsServiceGetAlertsByIdKeyFn({ id }), queryFn: () => AlertsService.getAlertsById({ id }) });
export const ensureUseAlertsServiceGetAlertsSearchData = (queryClient: QueryClient, { from, limit, page, priority, query, to, type }: {
  from?: string;
  limit?: number;
  page?: number;
  priority?: AlertPriority;
  query?: string;
  to?: string;
  type?: AlertType;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseAlertsServiceGetAlertsSearchKeyFn({ from, limit, page, priority, query, to, type }), queryFn: () => AlertsService.getAlertsSearch({ from, limit, page, priority, query, to, type }) });
export const ensureUseAlertsServiceGetAlertsActiveData = (queryClient: QueryClient, { limit, page, priority }: {
  limit?: number;
  page?: number;
  priority?: AlertPriority;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseAlertsServiceGetAlertsActiveKeyFn({ limit, page, priority }), queryFn: () => AlertsService.getAlertsActive({ limit, page, priority }) });
export const ensureUseAlertsServiceGetAlertsHistoryData = (queryClient: QueryClient, { from, limit, page, to, type }: {
  from?: string;
  limit?: number;
  page?: number;
  to?: string;
  type?: AlertType;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseAlertsServiceGetAlertsHistoryKeyFn({ from, limit, page, to, type }), queryFn: () => AlertsService.getAlertsHistory({ from, limit, page, to, type }) });
export const ensureUseNotificationsServiceGetNotificationsData = (queryClient: QueryClient, { limit, page, read, type, userId }: {
  limit?: number;
  page?: number;
  read?: boolean;
  type?: NotificationType;
  userId?: string;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseNotificationsServiceGetNotificationsKeyFn({ limit, page, read, type, userId }), queryFn: () => NotificationsService.getNotifications({ limit, page, read, type, userId }) });
export const ensureUseNotificationsServiceGetNotificationsByIdData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseNotificationsServiceGetNotificationsByIdKeyFn({ id }), queryFn: () => NotificationsService.getNotificationsById({ id }) });
