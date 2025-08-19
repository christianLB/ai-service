/**
 * Client Management Hook - SDK Version
 *
 * This hook uses the SDK client with openapi-fetch for type-safe API calls.
 * It replaces the axios-based use-client.ts hook.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { financialApi } from '../lib/api-client';
import type { components } from '@ai/contracts';

// Use types from the OpenAPI contracts
type CreateClientDto = components['schemas']['CreateClientDto'];
type UpdateClientDto = components['schemas']['UpdateClientDto'];
type ClientQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

const QUERY_KEY = 'clients';

/**
 * Hook to fetch all clients with pagination
 */
export function useClients(params?: ClientQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const { data, error } = await financialApi.GET('/clients', {
        params: {
          query: params,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch clients');
      }

      return data?.data;
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

      const { data, error } = await financialApi.GET('/clients/{id}', {
        params: {
          path: { id },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch client');
      }

      return data?.data;
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
      const { data, error } = await financialApi.GET('/clients/search', {
        params: {
          query: { q: query },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to search clients');
      }

      return data?.data;
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
    mutationFn: async (clientData: CreateClientDto) => {
      const { data, error } = await financialApi.POST('/clients', {
        body: clientData,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Client created successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to create client');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClientDto }) => {
      const { data: response, error } = await financialApi.PUT('/clients/{id}', {
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
      message.success(response?.message || 'Client updated successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to update client');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await financialApi.DELETE('/clients/{id}', {
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
      message.success(response?.message || 'Client deleted successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to delete client');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await financialApi.DELETE('/clients/bulk', {
        body: { ids },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Clients deleted successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to delete clients');
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
        const { data, error } = await financialApi.GET('/clients/{id}', {
          params: {
            path: { id },
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch client');
        }

        return data?.data;
      },
    });
  };

  const prefetchClients = async (params?: ClientQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const { data, error } = await financialApi.GET('/clients', {
          params: {
            query: params,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch clients');
        }

        return data?.data;
      },
    });
  };

  return {
    prefetchClient,
    prefetchClients,
  };
}
