import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { AxiosError } from 'axios';
import type { Alert, CreateAlert, AlertQuery } from '../types/alert.types';

const QUERY_KEY = 'alerts';

interface AlertResponse {
  success: boolean;
  data: Alert;
  message?: string;
}

interface AlertListResponse {
  success: boolean;
  data: {
    items: Alert[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all alerts with pagination
 */
export function useAlerts(params?: AlertQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<AlertListResponse>('/alerts', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single alert by ID
 */
export function useAlert(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<AlertResponse>(`/alerts/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search alerts
 */
export function useAlertSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Alert[] }>('/alerts/search', {
        params: { q: query },
      });
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for alert mutations (create, update, delete)
 */
export function useAlertMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateAlert) => {
      const response = await api.post<AlertResponse>('/alerts', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Alert created successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to create alert');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Alert> }) => {
      const response = await api.put<AlertResponse>(`/alerts/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Alert updated successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to update alert');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/alerts/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Alert deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to delete alert');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{
        success: boolean;
        data: { count: number };
        message: string;
      }>('/alerts/bulk', { data: { ids } });
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Alerts deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to delete alerts');
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
}

/**
 * Hook to prefetch alert data
 */
export function useAlertPrefetch() {
  const queryClient = useQueryClient();

  const prefetchAlert = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<AlertResponse>(`/alerts/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchAlerts = async (params?: AlertQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<AlertListResponse>('/alerts', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchAlert,
    prefetchAlerts,
  };
}
