/**
 * Notification Management Hook - SDK Version
 *
 * This hook uses the SDK client with openapi-fetch for type-safe API calls.
 * It replaces the axios-based use-notification.ts hook.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { commApi } from '../lib/api-client';
import type { components } from '@ai/contracts';

// Use types from the OpenAPI contracts
type CreateNotificationDto = components['schemas']['CreateNotificationDto'];
type UpdateNotificationDto = components['schemas']['UpdateNotificationDto'];
type NotificationQuery = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

const QUERY_KEY = 'notifications';

/**
 * Hook to fetch all notifications with pagination
 */
export function useNotifications(params?: NotificationQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const { data, error } = await commApi.GET('/notifications', {
        params: {
          query: params,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch notifications');
      }

      return data?.data;
    },
  });
}

/**
 * Hook to fetch a single notification by ID
 */
export function useNotification(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data, error } = await commApi.GET('/notifications/{id}', {
        params: {
          path: { id },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch notification');
      }

      return data?.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search notifications
 */
export function useNotificationSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const { data, error } = await commApi.GET('/notifications/search', {
        params: {
          query: { q: query },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to search notifications');
      }

      return data?.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for notification mutations (create, update, delete)
 */
export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (notificationData: CreateNotificationDto) => {
      const { data, error } = await commApi.POST('/notifications', {
        body: notificationData,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Notification created successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to create notification');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateNotificationDto }) => {
      const { data: response, error } = await commApi.PUT('/notifications/{id}', {
        params: {
          path: { id },
        },
        body: data,
      });

      if (error) {
        throw error;
      }

      return response;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response?.message || 'Notification updated successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to update notification');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await commApi.DELETE('/notifications/{id}', {
        params: {
          path: { id },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Notification deleted successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to delete notification');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await commApi.DELETE('/notifications/bulk', {
        body: { ids },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Notifications deleted successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to delete notifications');
    },
  });

  // Mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (ids: string | string[]) => {
      const notificationIds = Array.isArray(ids) ? ids : [ids];
      const { data, error } = await commApi.POST('/notifications/mark-read', {
        body: { ids: notificationIds },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Notifications marked as read');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to mark notifications as read');
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await commApi.POST('/notifications/mark-all-read', {});

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'All notifications marked as read');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to mark all notifications as read');
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [QUERY_KEY, 'unread-count'],
    queryFn: async () => {
      const { data, error } = await commApi.GET('/notifications/unread-count', {});

      if (error) {
        throw new Error(error.message || 'Failed to fetch unread count');
      }

      return data?.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to prefetch notification data
 */
export function useNotificationPrefetch() {
  const queryClient = useQueryClient();

  const prefetchNotification = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const { data, error } = await commApi.GET('/notifications/{id}', {
          params: {
            path: { id },
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch notification');
        }

        return data?.data;
      },
    });
  };

  const prefetchNotifications = async (params?: NotificationQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const { data, error } = await commApi.GET('/notifications', {
          params: {
            query: params,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch notifications');
        }

        return data?.data;
      },
    });
  };

  return {
    prefetchNotification,
    prefetchNotifications,
  };
}
