// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryOptions, useSuspenseQuery } from '@tanstack/react-query';
import {
  AccountsService,
  AttachmentsService,
  ClientsService,
  GoCardlessService,
  InvoicesService,
  TransactionsService,
} from '../requests/services.gen';
import * as Common from './common';
export const useAccountsServiceListAccountsSuspense = <
  TData = Common.AccountsServiceListAccountsDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAccountsServiceListAccountsKeyFn({ limit, page }, queryKey),
    queryFn: () => AccountsService.listAccounts({ limit, page }) as TData,
    ...options,
  });
export const useAccountsServiceGetAccountSuspense = <
  TData = Common.AccountsServiceGetAccountDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAccountsServiceGetAccountKeyFn({ id }, queryKey),
    queryFn: () => AccountsService.getAccount({ id }) as TData,
    ...options,
  });
export const useAccountsServiceGetAccountStatusSuspense = <
  TData = Common.AccountsServiceGetAccountStatusDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAccountsServiceGetAccountStatusKeyFn(queryKey),
    queryFn: () => AccountsService.getAccountStatus() as TData,
    ...options,
  });
export const useClientsServiceListClientsSuspense = <
  TData = Common.ClientsServiceListClientsDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseClientsServiceListClientsKeyFn({ email, limit, name, page }, queryKey),
    queryFn: () => ClientsService.listClients({ email, limit, name, page }) as TData,
    ...options,
  });
export const useClientsServiceGetClientByTaxIdSuspense = <
  TData = Common.ClientsServiceGetClientByTaxIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    taxId,
  }: {
    taxId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseClientsServiceGetClientByTaxIdKeyFn({ taxId }, queryKey),
    queryFn: () => ClientsService.getClientByTaxId({ taxId }) as TData,
    ...options,
  });
export const useClientsServiceGetClientSuspense = <
  TData = Common.ClientsServiceGetClientDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseClientsServiceGetClientKeyFn({ id }, queryKey),
    queryFn: () => ClientsService.getClient({ id }) as TData,
    ...options,
  });
export const useClientsServiceGetClientStatsSuspense = <
  TData = Common.ClientsServiceGetClientStatsDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseClientsServiceGetClientStatsKeyFn({ id }, queryKey),
    queryFn: () => ClientsService.getClientStats({ id }) as TData,
    ...options,
  });
export const useClientsServiceGetClientTransactionsSuspense = <
  TData = Common.ClientsServiceGetClientTransactionsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    dateFrom,
    dateTo,
    id,
    limit,
    page,
  }: {
    dateFrom?: string;
    dateTo?: string;
    id: string;
    limit?: number;
    page?: number;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseClientsServiceGetClientTransactionsKeyFn(
      { dateFrom, dateTo, id, limit, page },
      queryKey
    ),
    queryFn: () =>
      ClientsService.getClientTransactions({ dateFrom, dateTo, id, limit, page }) as TData,
    ...options,
  });
export const useInvoicesServiceListInvoicesSuspense = <
  TData = Common.InvoicesServiceListInvoicesDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseInvoicesServiceListInvoicesKeyFn(
      { clientId, limit, page, status },
      queryKey
    ),
    queryFn: () => InvoicesService.listInvoices({ clientId, limit, page, status }) as TData,
    ...options,
  });
export const useInvoicesServiceGetOverdueInvoicesSuspense = <
  TData = Common.InvoicesServiceGetOverdueInvoicesDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseInvoicesServiceGetOverdueInvoicesKeyFn({ limit, page }, queryKey),
    queryFn: () => InvoicesService.getOverdueInvoices({ limit, page }) as TData,
    ...options,
  });
export const useInvoicesServiceGetInvoiceByNumberSuspense = <
  TData = Common.InvoicesServiceGetInvoiceByNumberDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    invoiceNumber,
  }: {
    invoiceNumber: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseInvoicesServiceGetInvoiceByNumberKeyFn({ invoiceNumber }, queryKey),
    queryFn: () => InvoicesService.getInvoiceByNumber({ invoiceNumber }) as TData,
    ...options,
  });
export const useInvoicesServiceGetInvoiceSuspense = <
  TData = Common.InvoicesServiceGetInvoiceDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseInvoicesServiceGetInvoiceKeyFn({ id }, queryKey),
    queryFn: () => InvoicesService.getInvoice({ id }) as TData,
    ...options,
  });
export const useInvoicesServiceDownloadInvoicePdfSuspense = <
  TData = Common.InvoicesServiceDownloadInvoicePdfDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseInvoicesServiceDownloadInvoicePdfKeyFn({ id }, queryKey),
    queryFn: () => InvoicesService.downloadInvoicePdf({ id }) as TData,
    ...options,
  });
export const useTransactionsServiceListTransactionsSuspense = <
  TData = Common.TransactionsServiceListTransactionsDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseTransactionsServiceListTransactionsKeyFn(
      { accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type },
      queryKey
    ),
    queryFn: () =>
      TransactionsService.listTransactions({
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
export const useTransactionsServiceGetTransactionSuspense = <
  TData = Common.TransactionsServiceGetTransactionDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseTransactionsServiceGetTransactionKeyFn({ id }, queryKey),
    queryFn: () => TransactionsService.getTransaction({ id }) as TData,
    ...options,
  });
export const useTransactionsServiceExportTransactionsSuspense = <
  TData = Common.TransactionsServiceExportTransactionsDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseTransactionsServiceExportTransactionsKeyFn(
      { accountId, dateFrom, dateTo, format },
      queryKey
    ),
    queryFn: () =>
      TransactionsService.exportTransactions({ accountId, dateFrom, dateTo, format }) as TData,
    ...options,
  });
export const useGoCardlessServiceCheckGoCardlessCredentialsSuspense = <
  TData = Common.GoCardlessServiceCheckGoCardlessCredentialsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseGoCardlessServiceCheckGoCardlessCredentialsKeyFn(queryKey),
    queryFn: () => GoCardlessService.checkGoCardlessCredentials() as TData,
    ...options,
  });
export const useGoCardlessServiceGetGoCardlessStatusSuspense = <
  TData = Common.GoCardlessServiceGetGoCardlessStatusDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseGoCardlessServiceGetGoCardlessStatusKeyFn(queryKey),
    queryFn: () => GoCardlessService.getGoCardlessStatus() as TData,
    ...options,
  });
export const useAttachmentsServiceListAttachmentsSuspense = <
  TData = Common.AttachmentsServiceListAttachmentsDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAttachmentsServiceListAttachmentsKeyFn(
      { fileType, invoiceId, limit, page },
      queryKey
    ),
    queryFn: () =>
      AttachmentsService.listAttachments({ fileType, invoiceId, limit, page }) as TData,
    ...options,
  });
export const useAttachmentsServiceGetAttachmentSuspense = <
  TData = Common.AttachmentsServiceGetAttachmentDefaultResponse,
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
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAttachmentsServiceGetAttachmentKeyFn({ id }, queryKey),
    queryFn: () => AttachmentsService.getAttachment({ id }) as TData,
    ...options,
  });
