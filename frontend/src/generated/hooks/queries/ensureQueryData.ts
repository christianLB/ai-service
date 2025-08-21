// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { type QueryClient } from '@tanstack/react-query';
import { DefaultService } from '../requests/services.gen';
import * as Common from './common';
export const ensureUseDefaultServiceGetApiFinancialAccountsData = (
  queryClient: QueryClient,
  {
    limit,
    page,
  }: {
    limit?: number;
    page?: number;
  } = {}
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialAccountsKeyFn({ limit, page }),
    queryFn: () => DefaultService.getApiFinancialAccounts({ limit, page }),
  });
export const ensureUseDefaultServiceGetApiFinancialAccountsByIdData = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialAccountsByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialAccountsById({ id }),
  });
export const ensureUseDefaultServiceGetApiFinancialClientsData = (
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
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialClientsKeyFn({ email, limit, name, page }),
    queryFn: () => DefaultService.getApiFinancialClients({ email, limit, name, page }),
  });
export const ensureUseDefaultServiceGetApiFinancialClientsByIdData = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialClientsByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialClientsById({ id }),
  });
export const ensureUseDefaultServiceGetApiFinancialInvoicesData = (
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
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialInvoicesKeyFn({
      clientId,
      limit,
      page,
      status,
    }),
    queryFn: () => DefaultService.getApiFinancialInvoices({ clientId, limit, page, status }),
  });
export const ensureUseDefaultServiceGetApiFinancialInvoicesByIdData = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialInvoicesByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialInvoicesById({ id }),
  });
export const ensureUseDefaultServiceGetApiFinancialTransactionsData = (
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
  queryClient.ensureQueryData({
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
export const ensureUseDefaultServiceGetApiFinancialTransactionsByIdData = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialTransactionsById({ id }),
  });
export const ensureUseDefaultServiceGetApiFinancialTransactionsExportData = (
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
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsExportKeyFn({
      accountId,
      dateFrom,
      dateTo,
      format,
    }),
    queryFn: () =>
      DefaultService.getApiFinancialTransactionsExport({ accountId, dateFrom, dateTo, format }),
  });
export const ensureUseDefaultServiceGetApiFinancialAttachmentsData = (
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
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialAttachmentsKeyFn({
      fileType,
      invoiceId,
      limit,
      page,
    }),
    queryFn: () => DefaultService.getApiFinancialAttachments({ fileType, invoiceId, limit, page }),
  });
export const ensureUseDefaultServiceGetApiFinancialAttachmentsByIdData = (
  queryClient: QueryClient,
  {
    id,
  }: {
    id: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseDefaultServiceGetApiFinancialAttachmentsByIdKeyFn({ id }),
    queryFn: () => DefaultService.getApiFinancialAttachmentsById({ id }),
  });
