import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { AxiosError } from 'axios';
import type { EntityTag, CreateEntityTag, EntityTagQuery } from '../types/entity-tag.types';

const QUERY_KEY = 'entity-tags';

interface EntityTagResponse {
  success: boolean;
  data: EntityTag;
  message?: string;
}

interface EntityTagListResponse {
  success: boolean;
  data: {
    items: EntityTag[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all entitytags with pagination
 */
export function useEntityTags(params?: EntityTagQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<EntityTagListResponse>('/entity-tags', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single entitytag by ID
 */
export function useEntityTag(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<EntityTagResponse>(`/entity-tags/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search entitytags
 */
export function useEntityTagSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: EntityTag[] }>(
        '/entity-tags/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for entitytag mutations (create, update, delete)
 */
export function useEntityTagMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateEntityTag) => {
      const response = await api.post<EntityTagResponse>('/entity-tags', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'EntityTag created successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to create entitytag');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EntityTag> }) => {
      const response = await api.put<EntityTagResponse>(`/entity-tags/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'EntityTag updated successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to update entitytag');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(
        `/entity-tags/${id}`
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'EntityTag deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to delete entitytag');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{
        success: boolean;
        data: { count: number };
        message: string;
      }>('/entity-tags/bulk', { data: { ids } });
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'EntityTags deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to delete entitytags');
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
 * Hook to prefetch entitytag data
 */
export function useEntityTagPrefetch() {
  const queryClient = useQueryClient();

  const prefetchEntityTag = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<EntityTagResponse>(`/entity-tags/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchEntityTags = async (params?: EntityTagQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<EntityTagListResponse>('/entity-tags', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchEntityTag,
    prefetchEntityTags,
  };
}
