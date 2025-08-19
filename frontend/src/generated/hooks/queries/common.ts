// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryResult } from '@tanstack/react-query';
import { DefaultService } from '../requests/services.gen';
export type DefaultServiceGetApiFinancialAccountsDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialAccounts>
>;
export type DefaultServiceGetApiFinancialAccountsQueryResult<
  TData = DefaultServiceGetApiFinancialAccountsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialAccountsKey = 'DefaultServiceGetApiFinancialAccounts';
export const UseDefaultServiceGetApiFinancialAccountsKeyFn = (
  {
    limit,
    page,
  }: {
    limit?: number;
    page?: number;
  } = {},
  queryKey?: Array<unknown>
) => [useDefaultServiceGetApiFinancialAccountsKey, ...(queryKey ?? [{ limit, page }])];
export type DefaultServiceGetApiFinancialAccountsByIdDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialAccountsById>
>;
export type DefaultServiceGetApiFinancialAccountsByIdQueryResult<
  TData = DefaultServiceGetApiFinancialAccountsByIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialAccountsByIdKey =
  'DefaultServiceGetApiFinancialAccountsById';
export const UseDefaultServiceGetApiFinancialAccountsByIdKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useDefaultServiceGetApiFinancialAccountsByIdKey, ...(queryKey ?? [{ id }])];
export type DefaultServiceGetApiFinancialClientsDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialClients>
>;
export type DefaultServiceGetApiFinancialClientsQueryResult<
  TData = DefaultServiceGetApiFinancialClientsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialClientsKey = 'DefaultServiceGetApiFinancialClients';
export const UseDefaultServiceGetApiFinancialClientsKeyFn = (
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
  queryKey?: Array<unknown>
) => [useDefaultServiceGetApiFinancialClientsKey, ...(queryKey ?? [{ email, limit, name, page }])];
export type DefaultServiceGetApiFinancialClientsByIdDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialClientsById>
>;
export type DefaultServiceGetApiFinancialClientsByIdQueryResult<
  TData = DefaultServiceGetApiFinancialClientsByIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialClientsByIdKey =
  'DefaultServiceGetApiFinancialClientsById';
export const UseDefaultServiceGetApiFinancialClientsByIdKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useDefaultServiceGetApiFinancialClientsByIdKey, ...(queryKey ?? [{ id }])];
export type DefaultServiceGetApiFinancialInvoicesDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialInvoices>
>;
export type DefaultServiceGetApiFinancialInvoicesQueryResult<
  TData = DefaultServiceGetApiFinancialInvoicesDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialInvoicesKey = 'DefaultServiceGetApiFinancialInvoices';
export const UseDefaultServiceGetApiFinancialInvoicesKeyFn = (
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
  queryKey?: Array<unknown>
) => [
  useDefaultServiceGetApiFinancialInvoicesKey,
  ...(queryKey ?? [{ clientId, limit, page, status }]),
];
export type DefaultServiceGetApiFinancialInvoicesByIdDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialInvoicesById>
>;
export type DefaultServiceGetApiFinancialInvoicesByIdQueryResult<
  TData = DefaultServiceGetApiFinancialInvoicesByIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialInvoicesByIdKey =
  'DefaultServiceGetApiFinancialInvoicesById';
export const UseDefaultServiceGetApiFinancialInvoicesByIdKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useDefaultServiceGetApiFinancialInvoicesByIdKey, ...(queryKey ?? [{ id }])];
export type DefaultServiceGetApiFinancialTransactionsDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialTransactions>
>;
export type DefaultServiceGetApiFinancialTransactionsQueryResult<
  TData = DefaultServiceGetApiFinancialTransactionsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialTransactionsKey =
  'DefaultServiceGetApiFinancialTransactions';
export const UseDefaultServiceGetApiFinancialTransactionsKeyFn = (
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
  queryKey?: Array<unknown>
) => [
  useDefaultServiceGetApiFinancialTransactionsKey,
  ...(queryKey ?? [
    { accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type },
  ]),
];
export type DefaultServiceGetApiFinancialTransactionsByIdDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialTransactionsById>
>;
export type DefaultServiceGetApiFinancialTransactionsByIdQueryResult<
  TData = DefaultServiceGetApiFinancialTransactionsByIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialTransactionsByIdKey =
  'DefaultServiceGetApiFinancialTransactionsById';
export const UseDefaultServiceGetApiFinancialTransactionsByIdKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useDefaultServiceGetApiFinancialTransactionsByIdKey, ...(queryKey ?? [{ id }])];
export type DefaultServiceGetApiFinancialTransactionsExportDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialTransactionsExport>
>;
export type DefaultServiceGetApiFinancialTransactionsExportQueryResult<
  TData = DefaultServiceGetApiFinancialTransactionsExportDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialTransactionsExportKey =
  'DefaultServiceGetApiFinancialTransactionsExport';
export const UseDefaultServiceGetApiFinancialTransactionsExportKeyFn = (
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
  queryKey?: Array<unknown>
) => [
  useDefaultServiceGetApiFinancialTransactionsExportKey,
  ...(queryKey ?? [{ accountId, dateFrom, dateTo, format }]),
];
export type DefaultServiceGetApiFinancialAttachmentsDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialAttachments>
>;
export type DefaultServiceGetApiFinancialAttachmentsQueryResult<
  TData = DefaultServiceGetApiFinancialAttachmentsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialAttachmentsKey =
  'DefaultServiceGetApiFinancialAttachments';
export const UseDefaultServiceGetApiFinancialAttachmentsKeyFn = (
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
  queryKey?: Array<unknown>
) => [
  useDefaultServiceGetApiFinancialAttachmentsKey,
  ...(queryKey ?? [{ fileType, invoiceId, limit, page }]),
];
export type DefaultServiceGetApiFinancialAttachmentsByIdDefaultResponse = Awaited<
  ReturnType<typeof DefaultService.getApiFinancialAttachmentsById>
>;
export type DefaultServiceGetApiFinancialAttachmentsByIdQueryResult<
  TData = DefaultServiceGetApiFinancialAttachmentsByIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useDefaultServiceGetApiFinancialAttachmentsByIdKey =
  'DefaultServiceGetApiFinancialAttachmentsById';
export const UseDefaultServiceGetApiFinancialAttachmentsByIdKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useDefaultServiceGetApiFinancialAttachmentsByIdKey, ...(queryKey ?? [{ id }])];
