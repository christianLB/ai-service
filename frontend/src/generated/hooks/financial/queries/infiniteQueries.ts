// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { InfiniteData, UseInfiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { AccountsService, AttachmentsService, ClientsService, InvoiceTemplatesService, InvoicesService, TransactionsService } from "../requests/services.gen";
import * as Common from "./common";
export const useAccountsServiceListAccountsInfinite = <TData = InfiniteData<Common.AccountsServiceListAccountsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit }: {
  limit?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseAccountsServiceListAccountsKeyFn({ limit }, queryKey), queryFn: ({ pageParam }) => AccountsService.listAccounts({ limit, page: pageParam as number }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useClientsServiceListClientsInfinite = <TData = InfiniteData<Common.ClientsServiceListClientsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ email, limit, name }: {
  email?: string;
  limit?: number;
  name?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseClientsServiceListClientsKeyFn({ email, limit, name }, queryKey), queryFn: ({ pageParam }) => ClientsService.listClients({ email, limit, name, page: pageParam as number }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useClientsServiceGetClientTransactionsInfinite = <TData = InfiniteData<Common.ClientsServiceGetClientTransactionsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ dateFrom, dateTo, id, limit }: {
  dateFrom?: string;
  dateTo?: string;
  id: string;
  limit?: number;
}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseClientsServiceGetClientTransactionsKeyFn({ dateFrom, dateTo, id, limit }, queryKey), queryFn: ({ pageParam }) => ClientsService.getClientTransactions({ dateFrom, dateTo, id, limit, page: pageParam as number }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useInvoicesServiceListInvoicesInfinite = <TData = InfiniteData<Common.InvoicesServiceListInvoicesDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ clientId, limit, status }: {
  clientId?: string;
  limit?: number;
  status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseInvoicesServiceListInvoicesKeyFn({ clientId, limit, status }, queryKey), queryFn: ({ pageParam }) => InvoicesService.listInvoices({ clientId, limit, page: pageParam as number, status }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useInvoicesServiceGetOverdueInvoicesInfinite = <TData = InfiniteData<Common.InvoicesServiceGetOverdueInvoicesDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit }: {
  limit?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseInvoicesServiceGetOverdueInvoicesKeyFn({ limit }, queryKey), queryFn: ({ pageParam }) => InvoicesService.getOverdueInvoices({ limit, page: pageParam as number }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useTransactionsServiceListTransactionsInfinite = <TData = InfiniteData<Common.TransactionsServiceListTransactionsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, search, status, type }: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  maxAmount?: number;
  minAmount?: number;
  search?: string;
  status?: "cancelled" | "pending" | "confirmed" | "failed";
  type?: "debit" | "credit" | "transfer";
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseTransactionsServiceListTransactionsKeyFn({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, search, status, type }, queryKey), queryFn: ({ pageParam }) => TransactionsService.listTransactions({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page: pageParam as number, search, status, type }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useAttachmentsServiceListAttachmentsInfinite = <TData = InfiniteData<Common.AttachmentsServiceListAttachmentsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ fileType, invoiceId, limit }: {
  fileType?: string;
  invoiceId?: string;
  limit?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseAttachmentsServiceListAttachmentsKeyFn({ fileType, invoiceId, limit }, queryKey), queryFn: ({ pageParam }) => AttachmentsService.listAttachments({ fileType, invoiceId, limit, page: pageParam as number }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useInvoiceTemplatesServiceListInvoiceTemplatesInfinite = <TData = InfiniteData<Common.InvoiceTemplatesServiceListInvoiceTemplatesDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, search, sortBy, sortOrder }: {
  limit?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseInvoiceTemplatesServiceListInvoiceTemplatesKeyFn({ limit, search, sortBy, sortOrder }, queryKey), queryFn: ({ pageParam }) => InvoiceTemplatesService.listInvoiceTemplates({ limit, page: pageParam as number, search, sortBy, sortOrder }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
