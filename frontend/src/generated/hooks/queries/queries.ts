// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { DefaultService } from '../requests/services.gen';
import * as Common from './common';
export const useDefaultServiceGetApiFinancialAccounts = <
  TData = Common.DefaultServiceGetApiFinancialAccountsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    limit,
    page,
  }: {
    limit?: number;
    page?: number;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialAccountsKeyFn({ limit, page }, queryKey),
    queryFn: () => DefaultService.getApiFinancialAccounts({ limit, page }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialAccountsById = <
  TData = Common.DefaultServiceGetApiFinancialAccountsByIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    id,
  }: {
    id: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialAccountsByIdKeyFn({ id }, queryKey),
    queryFn: () => DefaultService.getApiFinancialAccountsById({ id }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialClients = <
  TData = Common.DefaultServiceGetApiFinancialClientsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialClientsKeyFn(
      { email, limit, name, page },
      queryKey
    ),
    queryFn: () => DefaultService.getApiFinancialClients({ email, limit, name, page }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialClientsById = <
  TData = Common.DefaultServiceGetApiFinancialClientsByIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    id,
  }: {
    id: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialClientsByIdKeyFn({ id }, queryKey),
    queryFn: () => DefaultService.getApiFinancialClientsById({ id }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialInvoices = <
  TData = Common.DefaultServiceGetApiFinancialInvoicesDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialInvoicesKeyFn(
      { clientId, limit, page, status },
      queryKey
    ),
    queryFn: () =>
      DefaultService.getApiFinancialInvoices({ clientId, limit, page, status }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialInvoicesById = <
  TData = Common.DefaultServiceGetApiFinancialInvoicesByIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    id,
  }: {
    id: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialInvoicesByIdKeyFn({ id }, queryKey),
    queryFn: () => DefaultService.getApiFinancialInvoicesById({ id }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialTransactions = <
  TData = Common.DefaultServiceGetApiFinancialTransactionsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsKeyFn(
      { accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type },
      queryKey
    ),
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
      }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialTransactionsById = <
  TData = Common.DefaultServiceGetApiFinancialTransactionsByIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    id,
  }: {
    id: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsByIdKeyFn({ id }, queryKey),
    queryFn: () => DefaultService.getApiFinancialTransactionsById({ id }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialTransactionsExport = <
  TData = Common.DefaultServiceGetApiFinancialTransactionsExportDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsExportKeyFn(
      { accountId, dateFrom, dateTo, format },
      queryKey
    ),
    queryFn: () =>
      DefaultService.getApiFinancialTransactionsExport({
        accountId,
        dateFrom,
        dateTo,
        format,
      }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialAttachments = <
  TData = Common.DefaultServiceGetApiFinancialAttachmentsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialAttachmentsKeyFn(
      { fileType, invoiceId, limit, page },
      queryKey
    ),
    queryFn: () =>
      DefaultService.getApiFinancialAttachments({ fileType, invoiceId, limit, page }) as TData,
    ...options,
  });
export const useDefaultServiceGetApiFinancialAttachmentsById = <
  TData = Common.DefaultServiceGetApiFinancialAttachmentsByIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    id,
  }: {
    id: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseDefaultServiceGetApiFinancialAttachmentsByIdKeyFn({ id }, queryKey),
    queryFn: () => DefaultService.getApiFinancialAttachmentsById({ id }) as TData,
    ...options,
  });
