import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { AxiosError } from 'axios';
import type { 
  Client, 
  CreateClient, 
  ClientQuery 
} from '../types/client.types';

const QUERY_KEY = 'clients';

interface ClientResponse {
  success: boolean;
  data: Client;
  message?: string;
}

interface ClientListResponse {
  success: boolean;
  data: {
    items: Client[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all clients with pagination
 */
export function useClients(params?: ClientQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<ClientListResponse>('/clients', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single client by ID
 */
export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<ClientResponse>(`/clients/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search clients
 */
export function useClientSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Client[] }>(
        '/clients/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for client mutations (create, update, delete)
 */
export function useClientMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateClient) => {
      const response = await api.post<ClientResponse>('/clients', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Client created successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to create client');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const response = await api.put<ClientResponse>(`/clients/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Client updated successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to update client');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/clients/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Client deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to delete client');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>(
        '/clients/bulk',
        { data: { ids } }
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Clients deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to delete clients');
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
 * Hook to prefetch client data
 */
export function useClientPrefetch() {
  const queryClient = useQueryClient();

  const prefetchClient = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<ClientResponse>(`/clients/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchClients = async (params?: ClientQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<ClientListResponse>('/clients', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchClient,
    prefetchClients,
  };
}