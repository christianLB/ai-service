import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  useAccountsServiceListAccounts,
  useAccountsServiceGetAccount,
  useAccountsServiceGetAccountStatus,
} from '../generated/hooks/financial/queries/queries';
import type { AccountsQuery } from '../types/accounts.types';

const QUERY_KEY = 'accounts';

/**
 * Hook to fetch all accounts with pagination - using generated OpenAPI hooks
 */
export function useAccounts(params?: AccountsQuery) {
  return useAccountsServiceListAccounts({
    page: params?.page,
    limit: params?.limit,
  });
}

/**
 * Hook to fetch a single account by ID - using generated OpenAPI hooks
 */
export function useAccount(id: string | undefined) {
  return useAccountsServiceGetAccount(
    { id: id! },
    undefined,
    { enabled: !!id }
  );
}

/**
 * Hook to get account status - using generated OpenAPI hooks
 */
export function useAccountStatus() {
  return useAccountsServiceGetAccountStatus();
}

/**
 * Hook to search accounts - fallback to list with filtering
 * Note: Search endpoint not available in OpenAPI spec, using list with client-side filtering
 */
export function useAccountsSearch(query: string) {
  const { data, ...rest } = useAccountsServiceListAccounts({}, undefined, {
    enabled: query.length > 0,
  });

  // Client-side filtering as search endpoint not available
  const filteredData = data?.data?.items?.filter((account: any) =>
    Object.values(account).some(value =>
      String(value).toLowerCase().includes(query.toLowerCase())
    )
  );

  return {
    data: filteredData,
    ...rest,
  };
}

/**
 * Hook for account mutations
 * Note: Create/Update/Delete endpoints not available in OpenAPI spec for accounts
 * These would need to be added to the OpenAPI spec if needed
 */
export function useAccountsMutations() {
  const queryClient = useQueryClient();

  // Since mutations are not available in the OpenAPI spec,
  // we'll provide placeholder functions that show error messages
  return {
    create: (data: any) => {
      message.error('Account creation not available - endpoint not in OpenAPI spec');
    },
    update: (params: { id: string; data: any }) => {
      message.error('Account update not available - endpoint not in OpenAPI spec');
    },
    delete: (id: string) => {
      message.error('Account deletion not available - endpoint not in OpenAPI spec');
    },
    bulkDelete: (ids: string[]) => {
      message.error('Bulk account deletion not available - endpoint not in OpenAPI spec');
    },
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isBulkDeleting: false,
  };
}

/**
 * Hook to prefetch accounts data - using generated OpenAPI hooks
 */
export function useAccountsPrefetch() {
  const queryClient = useQueryClient();

  const prefetchAccount = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['AccountsService.getAccount', { id }],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  const prefetchAccounts = async (params?: AccountsQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [
        'AccountsService.listAccounts',
        {
          page: params?.page,
          limit: params?.limit,
        },
      ],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  return {
    prefetchAccount,
    prefetchAccounts,
  };
}