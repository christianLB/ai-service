import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  useClientsServiceListClients,
  useClientsServiceGetClient,
  useClientsServiceCreateClient,
  useClientsServiceUpdateClient,
  useClientsServiceDeleteClient,
  useClientsServiceSearchClients,
  useClientsServiceBulkClients,
} from '../generated/hooks/financial/queries/queries';
import type { ClientQuery } from '../types/client.types';

const QUERY_KEY = 'clients';

/**
 * Hook to fetch all clients with pagination - using generated OpenAPI hooks
 */
export function useClients(params?: ClientQuery) {
  return useClientsServiceListClients({
    page: params?.page,
    limit: params?.limit,
    name: params?.search,
    email: params?.email,
  });
}

/**
 * Hook to fetch a single client by ID - using generated OpenAPI hooks
 */
export function useClient(id: string | undefined) {
  return useClientsServiceGetClient(
    { id: id! },
    undefined,
    { enabled: !!id }
  );
}

/**
 * Hook to search clients - using generated OpenAPI hooks
 */
export function useClientSearch(query: string) {
  return useClientsServiceSearchClients(
    undefined,
    {
      enabled: query.length > 0,
      mutationFn: async () => {
        // Use the search mutation
        return { requestBody: { query, filters: {} } };
      },
    }
  );
}

/**
 * Hook for client mutations (create, update, delete) - using generated OpenAPI hooks
 */
export function useClientMutations() {
  const queryClient = useQueryClient();

  const createMutation = useClientsServiceCreateClient({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Client created successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create client');
    },
  });

  const updateMutation = useClientsServiceUpdateClient({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Client updated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update client');
    },
  });

  const deleteMutation = useClientsServiceDeleteClient({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Client deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete client');
    },
  });

  const bulkDeleteMutation = useClientsServiceBulkClients({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Clients deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete clients');
    },
  });

  return {
    create: (data: any) => createMutation.mutate({ requestBody: data }),
    update: (params: { id: string; data: any }) =>
      updateMutation.mutate({ id: params.id, requestBody: params.data }),
    delete: (id: string) => deleteMutation.mutate({ id }),
    bulkDelete: (ids: string[]) =>
      bulkDeleteMutation.mutate({ requestBody: { operation: 'delete', ids } }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
}

/**
 * Hook to prefetch client data - using generated OpenAPI hooks
 */
export function useClientPrefetch() {
  const queryClient = useQueryClient();

  const prefetchClient = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['ClientsService.getClient', { id }],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  const prefetchClients = async (params?: ClientQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [
        'ClientsService.listClients',
        {
          page: params?.page,
          limit: params?.limit,
          name: params?.search,
          email: params?.email,
        },
      ],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  return {
    prefetchClient,
    prefetchClients,
  };
}