/**
 * Accounts Management Hook - SDK Version
 *
 * This hook uses the SDK client with openapi-fetch for type-safe API calls.
 * It replaces the axios-based use-accounts.ts hook.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { financialApi } from '../lib/api-client';
import type { components } from '@ai/contracts';

// Use types from the OpenAPI contracts
type CreateAccountDto = components['schemas']['CreateAccountDto'];
type UpdateAccountDto = components['schemas']['UpdateAccountDto'];
type AccountQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

const QUERY_KEY = 'accounts';

/**
 * Hook to fetch all accounts with pagination
 */
export function useAccounts(params?: AccountQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const { data, error } = await financialApi.GET('/accounts', {
        params: {
          query: params,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch accounts');
      }

      return data?.data;
    },
  });
}

/**
 * Hook to fetch a single account by ID
 */
export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data, error } = await financialApi.GET('/accounts/{id}', {
        params: {
          path: { id },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch account');
      }

      return data?.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search accounts
 */
export function useAccountSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const { data, error } = await financialApi.GET('/accounts/search', {
        params: {
          query: { q: query },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to search accounts');
      }

      return data?.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for account mutations (create, update, delete)
 */
export function useAccountMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (accountData: CreateAccountDto) => {
      const { data, error } = await financialApi.POST('/accounts', {
        body: accountData,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Account created successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to create account');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAccountDto }) => {
      const { data: response, error } = await financialApi.PUT('/accounts/{id}', {
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
      message.success(response?.message || 'Account updated successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to update account');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await financialApi.DELETE('/accounts/{id}', {
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
      message.success(response?.message || 'Account deleted successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to delete account');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await financialApi.DELETE('/accounts/bulk', {
        body: { ids },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Accounts deleted successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to delete accounts');
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
 * Hook to prefetch account data
 */
export function useAccountPrefetch() {
  const queryClient = useQueryClient();

  const prefetchAccount = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const { data, error } = await financialApi.GET('/accounts/{id}', {
          params: {
            path: { id },
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch account');
        }

        return data?.data;
      },
    });
  };

  const prefetchAccounts = async (params?: AccountQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const { data, error } = await financialApi.GET('/accounts', {
          params: {
            query: params,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch accounts');
        }

        return data?.data;
      },
    });
  };

  return {
    prefetchAccount,
    prefetchAccounts,
  };
}
