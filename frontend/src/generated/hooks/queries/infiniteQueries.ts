// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { InfiniteData, UseInfiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import { DefaultService } from '../requests/services.gen';
import * as Common from './common';
export const useDefaultServiceGetApiFinancialAccountsInfinite = <
  TData = InfiniteData<Common.DefaultServiceGetApiFinancialAccountsDefaultResponse>,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    limit,
  }: {
    limit?: number;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useInfiniteQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialAccountsKeyFn({ limit }, queryKey),
    queryFn: ({ pageParam }) =>
      DefaultService.getApiFinancialAccounts({ limit, page: pageParam as number }) as TData,
    initialPageParam: '1',
    getNextPageParam: (response) =>
      (
        response as {
          nextPage: string;
        }
      ).nextPage,
    ...options,
  });
export const useDefaultServiceGetApiFinancialClientsInfinite = <
  TData = InfiniteData<Common.DefaultServiceGetApiFinancialClientsDefaultResponse>,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    email,
    limit,
    name,
  }: {
    email?: string;
    limit?: number;
    name?: string;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useInfiniteQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialClientsKeyFn({ email, limit, name }, queryKey),
    queryFn: ({ pageParam }) =>
      DefaultService.getApiFinancialClients({
        email,
        limit,
        name,
        page: pageParam as number,
      }) as TData,
    initialPageParam: '1',
    getNextPageParam: (response) =>
      (
        response as {
          nextPage: string;
        }
      ).nextPage,
    ...options,
  });
export const useDefaultServiceGetApiFinancialInvoicesInfinite = <
  TData = InfiniteData<Common.DefaultServiceGetApiFinancialInvoicesDefaultResponse>,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    clientId,
    limit,
    status,
  }: {
    clientId?: string;
    limit?: number;
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useInfiniteQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialInvoicesKeyFn(
      { clientId, limit, status },
      queryKey
    ),
    queryFn: ({ pageParam }) =>
      DefaultService.getApiFinancialInvoices({
        clientId,
        limit,
        page: pageParam as number,
        status,
      }) as TData,
    initialPageParam: '1',
    getNextPageParam: (response) =>
      (
        response as {
          nextPage: string;
        }
      ).nextPage,
    ...options,
  });
export const useDefaultServiceGetApiFinancialTransactionsInfinite = <
  TData = InfiniteData<Common.DefaultServiceGetApiFinancialTransactionsDefaultResponse>,
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
    search?: string;
    status?: 'cancelled' | 'pending' | 'confirmed' | 'failed';
    type?: 'debit' | 'credit' | 'transfer';
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useInfiniteQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialTransactionsKeyFn(
      { accountId, dateFrom, dateTo, limit, maxAmount, minAmount, search, status, type },
      queryKey
    ),
    queryFn: ({ pageParam }) =>
      DefaultService.getApiFinancialTransactions({
        accountId,
        dateFrom,
        dateTo,
        limit,
        maxAmount,
        minAmount,
        page: pageParam as number,
        search,
        status,
        type,
      }) as TData,
    initialPageParam: '1',
    getNextPageParam: (response) =>
      (
        response as {
          nextPage: string;
        }
      ).nextPage,
    ...options,
  });
export const useDefaultServiceGetApiFinancialAttachmentsInfinite = <
  TData = InfiniteData<Common.DefaultServiceGetApiFinancialAttachmentsDefaultResponse>,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    fileType,
    invoiceId,
    limit,
  }: {
    fileType?: string;
    invoiceId?: string;
    limit?: number;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useInfiniteQuery({
    queryKey: Common.UseDefaultServiceGetApiFinancialAttachmentsKeyFn(
      { fileType, invoiceId, limit },
      queryKey
    ),
    queryFn: ({ pageParam }) =>
      DefaultService.getApiFinancialAttachments({
        fileType,
        invoiceId,
        limit,
        page: pageParam as number,
      }) as TData,
    initialPageParam: '1',
    getNextPageParam: (response) =>
      (
        response as {
          nextPage: string;
        }
      ).nextPage,
    ...options,
  });
