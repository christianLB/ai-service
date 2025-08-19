// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { type QueryClient } from '@tanstack/react-query';
import { DefaultService } from '../requests/services.gen';
import * as Common from './common';
export const prefetchUseDefaultServiceGetApiFinancialAccounts = (
  queryClient: QueryClient,
  {
    limit,
    page,
  }: {
    limit?: number;
    page?: number;
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialAccountsKeyFn({ limit, page }),
    queryFn: () => DefaultService.getApiFinancialAccounts({ limit, page }),
  });
export const prefetchUseDefaultServiceGetApiFinancialAccountsById = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialAccountsByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialAccountsById({ id }),
  });
export const prefetchUseDefaultServiceGetApiFinancialClients = (
  queryClient: QueryClient,
  {
    email,
    limit,
    name,
    page,
  }: {
    email?: string;
    limit?: number;
    name?: string;
    page?: number;
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialClientsKeyFn({ email, limit, name, page }),
    queryFn: () => DefaultService.getApiFinancialClients({ email, limit, name, page }),
  });
export const prefetchUseDefaultServiceGetApiFinancialClientsById = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialClientsByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialClientsById({ id }),
  });
export const prefetchUseDefaultServiceGetApiFinancialInvoices = (
  queryClient: QueryClient,
  {
    clientId,
    limit,
    page,
    status,
  }: {
    clientId?: string;
    limit?: number;
    page?: number;
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialInvoicesKeyFn({
      clientId,
      limit,
      page,
      status,
    }),
    queryFn: () => DefaultService.getApiFinancialInvoices({ clientId, limit, page, status }),
  });
export const prefetchUseDefaultServiceGetApiFinancialInvoicesById = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialInvoicesByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialInvoicesById({ id }),
  });
export const prefetchUseDefaultServiceGetApiFinancialTransactions = (
  queryClient: QueryClient,
  {
    accountId,
    dateFrom,
    dateTo,
    limit,
    maxAmount,
    minAmount,
    page,
    search,
    status,
    type,
  }: {
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    maxAmount?: number;
    minAmount?: number;
    page?: number;
    search?: string;
    status?: 'cancelled' | 'pending' | 'confirmed' | 'failed';
    type?: 'debit' | 'credit' | 'transfer';
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsKeyFn({
      accountId,
      dateFrom,
      dateTo,
      limit,
      maxAmount,
      minAmount,
      page,
      search,
      status,
      type,
    }),
    queryFn: () =>
      DefaultService.getApiFinancialTransactions({
        accountId,
        dateFrom,
        dateTo,
        limit,
        maxAmount,
        minAmount,
        page,
        search,
        status,
        type,
      }),
  });
export const prefetchUseDefaultServiceGetApiFinancialTransactionsById = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialTransactionsById({ id }),
  });
export const prefetchUseDefaultServiceGetApiFinancialTransactionsExport = (
  queryClient: QueryClient,
  {
    accountId,
    dateFrom,
    dateTo,
    format,
  }: {
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    format?: 'csv' | 'json';
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsExportKeyFn({
      accountId,
      dateFrom,
      dateTo,
      format,
    }),
    queryFn: () =>
      DefaultService.getApiFinancialTransactionsExport({ accountId, dateFrom, dateTo, format }),
  });
export const prefetchUseDefaultServiceGetApiFinancialAttachments = (
  queryClient: QueryClient,
  {
    fileType,
    invoiceId,
    limit,
    page,
  }: {
    fileType?: string;
    invoiceId?: string;
    limit?: number;
    page?: number;
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialAttachmentsKeyFn({
      fileType,
      invoiceId,
      limit,
      page,
    }),
    queryFn: () => DefaultService.getApiFinancialAttachments({ fileType, invoiceId, limit, page }),
  });
export const prefetchUseDefaultServiceGetApiFinancialAttachmentsById = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialAttachmentsByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialAttachmentsById({ id }),
  });
