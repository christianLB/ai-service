import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  useTransactionsServiceListTransactions,
  useTransactionsServiceGetTransaction,
  useTransactionsServiceExportTransactions,
  useTransactionsServiceImportTransactions,
  useTransactionsServiceCategorizeTransaction,
  useTransactionsServiceAutoCategorizeTransactions,
  useTransactionsServiceDeleteTransaction,
} from '../generated/hooks/financial/queries/queries';

const QUERY_KEY = 'transactions';

export interface TransactionListParams {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  status?: 'cancelled' | 'pending' | 'confirmed' | 'failed';
  type?: 'debit' | 'credit' | 'transfer';
  page?: number;
  limit?: number;
}

/**
 * Hook to fetch all transactions with pagination and filters - using generated OpenAPI hooks
 */
export function useTransactions(params?: TransactionListParams) {
  return useTransactionsServiceListTransactions({
    accountId: params?.accountId,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    minAmount: params?.minAmount,
    maxAmount: params?.maxAmount,
    search: params?.search,
    status: params?.status,
    type: params?.type,
    page: params?.page,
    limit: params?.limit,
  });
}

/**
 * Hook to fetch a single transaction by ID - using generated OpenAPI hooks
 */
export function useTransaction(id: string | undefined) {
  return useTransactionsServiceGetTransaction(
    { id: id! },
    undefined,
    { enabled: !!id }
  );
}

/**
 * Hook to export transactions - using generated OpenAPI hooks
 */
export function useExportTransactions(params?: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: 'csv' | 'json';
}) {
  return useTransactionsServiceExportTransactions(
    {
      accountId: params?.accountId,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      format: params?.format || 'csv',
    },
    undefined,
    {
      onSuccess: (data: any) => {
        // Handle file download
        const format = params?.format || 'csv';
        const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions-export.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success('Transactions exported successfully');
      },
      onError: () => {
        message.error('Failed to export transactions');
      },
    }
  );
}

/**
 * Hook for transaction mutations - using generated OpenAPI hooks
 */
export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const importMutation = useTransactionsServiceImportTransactions({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Transactions imported successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to import transactions');
    },
  });

  const categorizeMutation = useTransactionsServiceCategorizeTransaction({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Transaction categorized successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to categorize transaction');
    },
  });

  const autoCategorizeMutation = useTransactionsServiceAutoCategorizeTransactions({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Transactions auto-categorized successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to auto-categorize transactions');
    },
  });

  const deleteMutation = useTransactionsServiceDeleteTransaction({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Transaction deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete transaction');
    },
  });

  return {
    importTransactions: (file: File, accountId: string) =>
      importMutation.mutate({ formData: { file, accountId } }),
    categorize: (id: string, data: any) =>
      categorizeMutation.mutate({ id, requestBody: data }),
    autoCategorize: (transactionIds: string[]) =>
      autoCategorizeMutation.mutate({ requestBody: { transactionIds } }),
    delete: (id: string) => deleteMutation.mutate({ id }),
    isImporting: importMutation.isPending,
    isCategorizing: categorizeMutation.isPending,
    isAutoCategorizing: autoCategorizeMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook to prefetch transaction data - using generated OpenAPI hooks
 */
export function useTransactionPrefetch() {
  const queryClient = useQueryClient();

  const prefetchTransaction = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['TransactionsService.getTransaction', { id }],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  const prefetchTransactions = async (params?: TransactionListParams) => {
    await queryClient.prefetchQuery({
      queryKey: [
        'TransactionsService.listTransactions',
        {
          accountId: params?.accountId,
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          minAmount: params?.minAmount,
          maxAmount: params?.maxAmount,
          search: params?.search,
          status: params?.status,
          type: params?.type,
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
    prefetchTransaction,
    prefetchTransactions,
  };
}