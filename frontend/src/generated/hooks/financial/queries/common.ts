// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryResult } from '@tanstack/react-query';
import {
  AccountsService,
  AttachmentsService,
  ClientsService,
  GoCardlessService,
  InvoicesService,
  SchedulerService,
  SetupService,
  SyncService,
  TransactionsService,
} from '../requests/services.gen';
export type AccountsServiceListAccountsDefaultResponse = Awaited<
  ReturnType<typeof AccountsService.listAccounts>
>;
export type AccountsServiceListAccountsQueryResult<
  TData = AccountsServiceListAccountsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAccountsServiceListAccountsKey = 'AccountsServiceListAccounts';
export const UseAccountsServiceListAccountsKeyFn = (
  {
    limit,
    page,
  }: {
    limit?: number;
    page?: number;
  } = {},
  queryKey?: Array<unknown>
) => [useAccountsServiceListAccountsKey, ...(queryKey ?? [{ limit, page }])];
export type AccountsServiceGetAccountDefaultResponse = Awaited<
  ReturnType<typeof AccountsService.getAccount>
>;
export type AccountsServiceGetAccountQueryResult<
  TData = AccountsServiceGetAccountDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAccountsServiceGetAccountKey = 'AccountsServiceGetAccount';
export const UseAccountsServiceGetAccountKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useAccountsServiceGetAccountKey, ...(queryKey ?? [{ id }])];
export type AccountsServiceGetAccountStatusDefaultResponse = Awaited<
  ReturnType<typeof AccountsService.getAccountStatus>
>;
export type AccountsServiceGetAccountStatusQueryResult<
  TData = AccountsServiceGetAccountStatusDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAccountsServiceGetAccountStatusKey = 'AccountsServiceGetAccountStatus';
export const UseAccountsServiceGetAccountStatusKeyFn = (queryKey?: Array<unknown>) => [
  useAccountsServiceGetAccountStatusKey,
  ...(queryKey ?? []),
];
export type ClientsServiceListClientsDefaultResponse = Awaited<
  ReturnType<typeof ClientsService.listClients>
>;
export type ClientsServiceListClientsQueryResult<
  TData = ClientsServiceListClientsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useClientsServiceListClientsKey = 'ClientsServiceListClients';
export const UseClientsServiceListClientsKeyFn = (
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
) => [useClientsServiceListClientsKey, ...(queryKey ?? [{ email, limit, name, page }])];
export type ClientsServiceGetClientByTaxIdDefaultResponse = Awaited<
  ReturnType<typeof ClientsService.getClientByTaxId>
>;
export type ClientsServiceGetClientByTaxIdQueryResult<
  TData = ClientsServiceGetClientByTaxIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useClientsServiceGetClientByTaxIdKey = 'ClientsServiceGetClientByTaxId';
export const UseClientsServiceGetClientByTaxIdKeyFn = (
  {
    taxId,
  }: {
    taxId: string;
  },
  queryKey?: Array<unknown>
) => [useClientsServiceGetClientByTaxIdKey, ...(queryKey ?? [{ taxId }])];
export type ClientsServiceGetClientDefaultResponse = Awaited<
  ReturnType<typeof ClientsService.getClient>
>;
export type ClientsServiceGetClientQueryResult<
  TData = ClientsServiceGetClientDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useClientsServiceGetClientKey = 'ClientsServiceGetClient';
export const UseClientsServiceGetClientKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useClientsServiceGetClientKey, ...(queryKey ?? [{ id }])];
export type ClientsServiceGetClientStatsDefaultResponse = Awaited<
  ReturnType<typeof ClientsService.getClientStats>
>;
export type ClientsServiceGetClientStatsQueryResult<
  TData = ClientsServiceGetClientStatsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useClientsServiceGetClientStatsKey = 'ClientsServiceGetClientStats';
export const UseClientsServiceGetClientStatsKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useClientsServiceGetClientStatsKey, ...(queryKey ?? [{ id }])];
export type ClientsServiceGetClientTransactionsDefaultResponse = Awaited<
  ReturnType<typeof ClientsService.getClientTransactions>
>;
export type ClientsServiceGetClientTransactionsQueryResult<
  TData = ClientsServiceGetClientTransactionsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useClientsServiceGetClientTransactionsKey = 'ClientsServiceGetClientTransactions';
export const UseClientsServiceGetClientTransactionsKeyFn = (
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
  queryKey?: Array<unknown>
) => [
  useClientsServiceGetClientTransactionsKey,
  ...(queryKey ?? [{ dateFrom, dateTo, id, limit, page }]),
];
export type InvoicesServiceListInvoicesDefaultResponse = Awaited<
  ReturnType<typeof InvoicesService.listInvoices>
>;
export type InvoicesServiceListInvoicesQueryResult<
  TData = InvoicesServiceListInvoicesDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useInvoicesServiceListInvoicesKey = 'InvoicesServiceListInvoices';
export const UseInvoicesServiceListInvoicesKeyFn = (
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
) => [useInvoicesServiceListInvoicesKey, ...(queryKey ?? [{ clientId, limit, page, status }])];
export type InvoicesServiceGetOverdueInvoicesDefaultResponse = Awaited<
  ReturnType<typeof InvoicesService.getOverdueInvoices>
>;
export type InvoicesServiceGetOverdueInvoicesQueryResult<
  TData = InvoicesServiceGetOverdueInvoicesDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useInvoicesServiceGetOverdueInvoicesKey = 'InvoicesServiceGetOverdueInvoices';
export const UseInvoicesServiceGetOverdueInvoicesKeyFn = (
  {
    limit,
    page,
  }: {
    limit?: number;
    page?: number;
  } = {},
  queryKey?: Array<unknown>
) => [useInvoicesServiceGetOverdueInvoicesKey, ...(queryKey ?? [{ limit, page }])];
export type InvoicesServiceGetInvoiceByNumberDefaultResponse = Awaited<
  ReturnType<typeof InvoicesService.getInvoiceByNumber>
>;
export type InvoicesServiceGetInvoiceByNumberQueryResult<
  TData = InvoicesServiceGetInvoiceByNumberDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useInvoicesServiceGetInvoiceByNumberKey = 'InvoicesServiceGetInvoiceByNumber';
export const UseInvoicesServiceGetInvoiceByNumberKeyFn = (
  {
    invoiceNumber,
  }: {
    invoiceNumber: string;
  },
  queryKey?: Array<unknown>
) => [useInvoicesServiceGetInvoiceByNumberKey, ...(queryKey ?? [{ invoiceNumber }])];
export type InvoicesServiceGetInvoiceDefaultResponse = Awaited<
  ReturnType<typeof InvoicesService.getInvoice>
>;
export type InvoicesServiceGetInvoiceQueryResult<
  TData = InvoicesServiceGetInvoiceDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useInvoicesServiceGetInvoiceKey = 'InvoicesServiceGetInvoice';
export const UseInvoicesServiceGetInvoiceKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useInvoicesServiceGetInvoiceKey, ...(queryKey ?? [{ id }])];
export type InvoicesServiceDownloadInvoicePdfDefaultResponse = Awaited<
  ReturnType<typeof InvoicesService.downloadInvoicePdf>
>;
export type InvoicesServiceDownloadInvoicePdfQueryResult<
  TData = InvoicesServiceDownloadInvoicePdfDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useInvoicesServiceDownloadInvoicePdfKey = 'InvoicesServiceDownloadInvoicePdf';
export const UseInvoicesServiceDownloadInvoicePdfKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useInvoicesServiceDownloadInvoicePdfKey, ...(queryKey ?? [{ id }])];
export type TransactionsServiceListTransactionsDefaultResponse = Awaited<
  ReturnType<typeof TransactionsService.listTransactions>
>;
export type TransactionsServiceListTransactionsQueryResult<
  TData = TransactionsServiceListTransactionsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useTransactionsServiceListTransactionsKey = 'TransactionsServiceListTransactions';
export const UseTransactionsServiceListTransactionsKeyFn = (
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
  useTransactionsServiceListTransactionsKey,
  ...(queryKey ?? [
    { accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type },
  ]),
];
export type TransactionsServiceGetTransactionDefaultResponse = Awaited<
  ReturnType<typeof TransactionsService.getTransaction>
>;
export type TransactionsServiceGetTransactionQueryResult<
  TData = TransactionsServiceGetTransactionDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useTransactionsServiceGetTransactionKey = 'TransactionsServiceGetTransaction';
export const UseTransactionsServiceGetTransactionKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useTransactionsServiceGetTransactionKey, ...(queryKey ?? [{ id }])];
export type TransactionsServiceExportTransactionsDefaultResponse = Awaited<
  ReturnType<typeof TransactionsService.exportTransactions>
>;
export type TransactionsServiceExportTransactionsQueryResult<
  TData = TransactionsServiceExportTransactionsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useTransactionsServiceExportTransactionsKey = 'TransactionsServiceExportTransactions';
export const UseTransactionsServiceExportTransactionsKeyFn = (
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
  useTransactionsServiceExportTransactionsKey,
  ...(queryKey ?? [{ accountId, dateFrom, dateTo, format }]),
];
export type GoCardlessServiceCheckGoCardlessCredentialsDefaultResponse = Awaited<
  ReturnType<typeof GoCardlessService.checkGoCardlessCredentials>
>;
export type GoCardlessServiceCheckGoCardlessCredentialsQueryResult<
  TData = GoCardlessServiceCheckGoCardlessCredentialsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useGoCardlessServiceCheckGoCardlessCredentialsKey =
  'GoCardlessServiceCheckGoCardlessCredentials';
export const UseGoCardlessServiceCheckGoCardlessCredentialsKeyFn = (queryKey?: Array<unknown>) => [
  useGoCardlessServiceCheckGoCardlessCredentialsKey,
  ...(queryKey ?? []),
];
export type GoCardlessServiceGetGoCardlessStatusDefaultResponse = Awaited<
  ReturnType<typeof GoCardlessService.getGoCardlessStatus>
>;
export type GoCardlessServiceGetGoCardlessStatusQueryResult<
  TData = GoCardlessServiceGetGoCardlessStatusDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useGoCardlessServiceGetGoCardlessStatusKey = 'GoCardlessServiceGetGoCardlessStatus';
export const UseGoCardlessServiceGetGoCardlessStatusKeyFn = (queryKey?: Array<unknown>) => [
  useGoCardlessServiceGetGoCardlessStatusKey,
  ...(queryKey ?? []),
];
export type AttachmentsServiceListAttachmentsDefaultResponse = Awaited<
  ReturnType<typeof AttachmentsService.listAttachments>
>;
export type AttachmentsServiceListAttachmentsQueryResult<
  TData = AttachmentsServiceListAttachmentsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAttachmentsServiceListAttachmentsKey = 'AttachmentsServiceListAttachments';
export const UseAttachmentsServiceListAttachmentsKeyFn = (
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
  useAttachmentsServiceListAttachmentsKey,
  ...(queryKey ?? [{ fileType, invoiceId, limit, page }]),
];
export type AttachmentsServiceGetAttachmentDefaultResponse = Awaited<
  ReturnType<typeof AttachmentsService.getAttachment>
>;
export type AttachmentsServiceGetAttachmentQueryResult<
  TData = AttachmentsServiceGetAttachmentDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAttachmentsServiceGetAttachmentKey = 'AttachmentsServiceGetAttachment';
export const UseAttachmentsServiceGetAttachmentKeyFn = (
  {
    id,
  }: {
    id: string;
  },
  queryKey?: Array<unknown>
) => [useAttachmentsServiceGetAttachmentKey, ...(queryKey ?? [{ id }])];
export type ClientsServiceCreateClientMutationResult = Awaited<
  ReturnType<typeof ClientsService.createClient>
>;
export type ClientsServiceSearchClientsMutationResult = Awaited<
  ReturnType<typeof ClientsService.searchClients>
>;
export type ClientsServiceBulkClientsMutationResult = Awaited<
  ReturnType<typeof ClientsService.bulkClients>
>;
export type InvoicesServiceCreateInvoiceMutationResult = Awaited<
  ReturnType<typeof InvoicesService.createInvoice>
>;
export type InvoicesServiceMarkInvoicePaidMutationResult = Awaited<
  ReturnType<typeof InvoicesService.markInvoicePaid>
>;
export type InvoicesServiceSendInvoiceMutationResult = Awaited<
  ReturnType<typeof InvoicesService.sendInvoice>
>;
export type InvoicesServiceDuplicateInvoiceMutationResult = Awaited<
  ReturnType<typeof InvoicesService.duplicateInvoice>
>;
export type InvoicesServiceAddInvoiceItemMutationResult = Awaited<
  ReturnType<typeof InvoicesService.addInvoiceItem>
>;
export type InvoicesServiceGenerateInvoicePdfMutationResult = Awaited<
  ReturnType<typeof InvoicesService.generateInvoicePdf>
>;
export type InvoicesServiceSendInvoiceEmailMutationResult = Awaited<
  ReturnType<typeof InvoicesService.sendInvoiceEmail>
>;
export type TransactionsServiceImportTransactionsMutationResult = Awaited<
  ReturnType<typeof TransactionsService.importTransactions>
>;
export type TransactionsServiceCategorizeTransactionMutationResult = Awaited<
  ReturnType<typeof TransactionsService.categorizeTransaction>
>;
export type TransactionsServiceAutoCategorizeTransactionsMutationResult = Awaited<
  ReturnType<typeof TransactionsService.autoCategorizeTransactions>
>;
export type GoCardlessServiceConfigureGoCardlessCredentialsMutationResult = Awaited<
  ReturnType<typeof GoCardlessService.configureGoCardlessCredentials>
>;
export type GoCardlessServiceTestGoCardlessConnectionMutationResult = Awaited<
  ReturnType<typeof GoCardlessService.testGoCardlessConnection>
>;
export type GoCardlessServiceDiagnoseGoCardlessIssuesMutationResult = Awaited<
  ReturnType<typeof GoCardlessService.diagnoseGoCardlessIssues>
>;
export type SetupServiceSetupBbvaConnectionMutationResult = Awaited<
  ReturnType<typeof SetupService.setupBbvaConnection>
>;
export type SetupServiceCompleteSetupMutationResult = Awaited<
  ReturnType<typeof SetupService.completeSetup>
>;
export type SyncServiceManualSyncMutationResult = Awaited<
  ReturnType<typeof SyncService.manualSync>
>;
export type SyncServiceSyncAccountsMutationResult = Awaited<
  ReturnType<typeof SyncService.syncAccounts>
>;
export type SyncServiceSyncBalancesMutationResult = Awaited<
  ReturnType<typeof SyncService.syncBalances>
>;
export type SyncServiceSyncTransactionsMutationResult = Awaited<
  ReturnType<typeof SyncService.syncTransactions>
>;
export type SchedulerServiceStartSchedulerMutationResult = Awaited<
  ReturnType<typeof SchedulerService.startScheduler>
>;
export type SchedulerServiceStopSchedulerMutationResult = Awaited<
  ReturnType<typeof SchedulerService.stopScheduler>
>;
export type ClientsServiceUpdateClientMutationResult = Awaited<
  ReturnType<typeof ClientsService.updateClient>
>;
export type InvoicesServiceUpdateInvoiceMutationResult = Awaited<
  ReturnType<typeof InvoicesService.updateInvoice>
>;
export type ClientsServiceDeleteClientMutationResult = Awaited<
  ReturnType<typeof ClientsService.deleteClient>
>;
export type InvoicesServiceDeleteInvoiceMutationResult = Awaited<
  ReturnType<typeof InvoicesService.deleteInvoice>
>;
export type TransactionsServiceDeleteTransactionMutationResult = Awaited<
  ReturnType<typeof TransactionsService.deleteTransaction>
>;
export type GoCardlessServiceDeleteGoCardlessCredentialsMutationResult = Awaited<
  ReturnType<typeof GoCardlessService.deleteGoCardlessCredentials>
>;
