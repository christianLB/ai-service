import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { 
  Strategy, 
  CreateStrategy, 
  StrategyQuery 
} from '../types/strategy.types';

const QUERY_KEY = 'strategys';

interface StrategyResponse {
  success: boolean;
  data: Strategy;
  message?: string;
}

interface StrategyListResponse {
  success: boolean;
  data: {
    items: Strategy[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all strategys with pagination
 */
export function useStrategys(params?: StrategyQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<StrategyListResponse>('/strategys', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single strategy by ID
 */
export function useStrategy(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<StrategyResponse>(`/strategys/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search strategys
 */
export function useStrategySearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Strategy[] }>(
        '/strategys/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for strategy mutations (create, update, delete)
 */
export function useStrategyMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateStrategy) => {
      const response = await api.post<StrategyResponse>('/strategys', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Strategy created successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create strategy');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Strategy> }) => {
      const response = await api.put<StrategyResponse>(`/strategys/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Strategy updated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update strategy');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/strategys/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Strategy deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete strategy');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>(
        '/strategys/bulk',
        { data: { ids } }
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Strategys deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete strategys');
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
 * Hook to prefetch strategy data
 */
export function useStrategyPrefetch() {
  const queryClient = useQueryClient();

  const prefetchStrategy = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<StrategyResponse>(`/strategys/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchStrategys = async (params?: StrategyQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<StrategyListResponse>('/strategys', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchStrategy,
    prefetchStrategys,
  };
}