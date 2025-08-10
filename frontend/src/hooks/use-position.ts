import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { AxiosError } from 'axios';
import type { 
  Position, 
  CreatePosition, 
  PositionQuery 
} from '../types/position.types';

const QUERY_KEY = 'positions';

interface PositionResponse {
  success: boolean;
  data: Position;
  message?: string;
}

interface PositionListResponse {
  success: boolean;
  data: {
    items: Position[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all positions with pagination
 */
export function usePositions(params?: PositionQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<PositionListResponse>('/positions', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single position by ID
 */
export function usePosition(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<PositionResponse>(`/positions/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search positions
 */
export function usePositionSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Position[] }>(
        '/positions/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for position mutations (create, update, delete)
 */
export function usePositionMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreatePosition) => {
      const response = await api.post<PositionResponse>('/positions', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Position created successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to create position');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Position> }) => {
      const response = await api.put<PositionResponse>(`/positions/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Position updated successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to update position');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/positions/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Position deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to delete position');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>(
        '/positions/bulk',
        { data: { ids } }
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Positions deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to delete positions');
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
 * Hook to prefetch position data
 */
export function usePositionPrefetch() {
  const queryClient = useQueryClient();

  const prefetchPosition = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<PositionResponse>(`/positions/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchPositions = async (params?: PositionQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<PositionListResponse>('/positions', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchPosition,
    prefetchPositions,
  };
}