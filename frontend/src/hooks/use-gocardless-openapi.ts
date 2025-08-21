import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  useGoCardlessServiceCheckGoCardlessCredentials,
  useGoCardlessServiceGetGoCardlessStatus,
  useGoCardlessServiceConfigureGoCardlessCredentials,
  useGoCardlessServiceTestGoCardlessConnection,
  useGoCardlessServiceDiagnoseGoCardlessIssues,
  useGoCardlessServiceDeleteGoCardlessCredentials,
  useSyncServiceManualSync,
  useSyncServiceSyncAccounts,
  useSyncServiceSyncBalances,
  useSyncServiceSyncTransactions,
} from '../generated/hooks/financial/queries/queries';

const QUERY_KEY = 'gocardless';

/**
 * Hook to check GoCardless credentials - using generated OpenAPI hooks
 */
export function useGoCardlessCredentials() {
  return useGoCardlessServiceCheckGoCardlessCredentials();
}

/**
 * Hook to get GoCardless status - using generated OpenAPI hooks
 */
export function useGoCardlessStatus() {
  return useGoCardlessServiceGetGoCardlessStatus();
}

/**
 * Hook for GoCardless configuration mutations - using generated OpenAPI hooks
 */
export function useGoCardlessMutations() {
  const queryClient = useQueryClient();

  const configureMutation = useGoCardlessServiceConfigureGoCardlessCredentials({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'GoCardless configured successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to configure GoCardless');
    },
  });

  const testConnectionMutation = useGoCardlessServiceTestGoCardlessConnection({
    onSuccess: (response: any) => {
      message.success(response.message || 'Connection test successful');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Connection test failed');
    },
  });

  const diagnoseMutation = useGoCardlessServiceDiagnoseGoCardlessIssues({
    onSuccess: (response: any) => {
      message.info('Diagnosis complete. Check the results.');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Diagnosis failed');
    },
  });

  const deleteMutation = useGoCardlessServiceDeleteGoCardlessCredentials({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'GoCardless credentials deleted');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete credentials');
    },
  });

  return {
    configure: (data: any) => configureMutation.mutate({ requestBody: data }),
    testConnection: () => testConnectionMutation.mutate(),
    diagnose: () => diagnoseMutation.mutate(),
    deleteCredentials: () => deleteMutation.mutate(),
    isConfiguring: configureMutation.isPending,
    isTesting: testConnectionMutation.isPending,
    isDiagnosing: diagnoseMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for GoCardless sync operations - using generated OpenAPI hooks
 */
export function useGoCardlessSync() {
  const queryClient = useQueryClient();

  const manualSyncMutation = useSyncServiceManualSync({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success(response.message || 'Manual sync completed successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Manual sync failed');
    },
  });

  const syncAccountsMutation = useSyncServiceSyncAccounts({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success(response.message || 'Accounts synced successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to sync accounts');
    },
  });

  const syncBalancesMutation = useSyncServiceSyncBalances({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success(response.message || 'Balances synced successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to sync balances');
    },
  });

  const syncTransactionsMutation = useSyncServiceSyncTransactions({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      message.success(response.message || 'Transactions synced successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to sync transactions');
    },
  });

  return {
    manualSync: () => manualSyncMutation.mutate(),
    syncAccounts: () => syncAccountsMutation.mutate(),
    syncBalances: (forceRefresh?: boolean) =>
      syncBalancesMutation.mutate({ requestBody: { forceRefresh } }),
    syncTransactions: (days?: number) =>
      syncTransactionsMutation.mutate({ requestBody: { days } }),
    isManualSyncing: manualSyncMutation.isPending,
    isSyncingAccounts: syncAccountsMutation.isPending,
    isSyncingBalances: syncBalancesMutation.isPending,
    isSyncingTransactions: syncTransactionsMutation.isPending,
  };
}