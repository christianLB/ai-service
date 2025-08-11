import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { 
  UniversalTag, 
  CreateUniversalTag, 
  UniversalTagQuery 
} from '../types/universal-tag.types';

const QUERY_KEY = 'universal-tags';

interface UniversalTagResponse {
  success: boolean;
  data: UniversalTag;
  message?: string;
}

interface UniversalTagListResponse {
  success: boolean;
  data: {
    items: UniversalTag[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all universaltags with pagination
 */
export function useUniversalTags(params?: UniversalTagQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<UniversalTagListResponse>('/universal-tags', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single universaltag by ID
 */
export function useUniversalTag(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<UniversalTagResponse>(`/universal-tags/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search universaltags
 */
export function useUniversalTagSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: UniversalTag[] }>(
        '/universal-tags/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for universaltag mutations (create, update, delete)
 */
export function useUniversalTagMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateUniversalTag) => {
      const response = await api.post<UniversalTagResponse>('/universal-tags', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'UniversalTag created successfully');
    },
    onError: (error) => {
      message.error((error as any).response?.data?.message || 'Failed to create universaltag');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UniversalTag> }) => {
      const response = await api.put<UniversalTagResponse>(`/universal-tags/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'UniversalTag updated successfully');
    },
    onError: (error) => {
      message.error((error as any).response?.data?.message || 'Failed to update universaltag');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/universal-tags/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'UniversalTag deleted successfully');
    },
    onError: (error) => {
      message.error((error as any).response?.data?.message || 'Failed to delete universaltag');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>(
        '/universal-tags/bulk',
        { data: { ids } }
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'UniversalTags deleted successfully');
    },
    onError: (error) => {
      message.error((error as any).response?.data?.message || 'Failed to delete universaltags');
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
 * Hook to prefetch universaltag data
 */
export function useUniversalTagPrefetch() {
  const queryClient = useQueryClient();

  const prefetchUniversalTag = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<UniversalTagResponse>(`/universal-tags/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchUniversalTags = async (params?: UniversalTagQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<UniversalTagListResponse>('/universal-tags', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchUniversalTag,
    prefetchUniversalTags,
  };
}