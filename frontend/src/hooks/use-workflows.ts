import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { 
  Workflows, 
  CreateWorkflows, 
  WorkflowsQuery 
} from '../types/workflows.types';

const QUERY_KEY = 'workflowss';

interface WorkflowsResponse {
  success: boolean;
  data: Workflows;
  message?: string;
}

interface WorkflowsListResponse {
  success: boolean;
  data: {
    items: Workflows[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all workflowss with pagination
 */
export function useWorkflowss(params?: WorkflowsQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<WorkflowsListResponse>('/workflowss', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single workflows by ID
 */
export function useWorkflows(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<WorkflowsResponse>(`/workflowss/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search workflowss
 */
export function useWorkflowsSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Workflows[] }>(
        '/workflowss/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for workflows mutations (create, update, delete)
 */
export function useWorkflowsMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateWorkflows) => {
      const response = await api.post<WorkflowsResponse>('/workflowss', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Workflows created successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create workflows');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Workflows> }) => {
      const response = await api.put<WorkflowsResponse>(`/workflowss/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Workflows updated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update workflows');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/workflowss/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Workflows deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete workflows');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>(
        '/workflowss/bulk',
        { data: { ids } }
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Workflowss deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete workflowss');
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
 * Hook to prefetch workflows data
 */
export function useWorkflowsPrefetch() {
  const queryClient = useQueryClient();

  const prefetchWorkflows = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<WorkflowsResponse>(`/workflowss/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchWorkflowss = async (params?: WorkflowsQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<WorkflowsListResponse>('/workflowss', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchWorkflows,
    prefetchWorkflowss,
  };
}