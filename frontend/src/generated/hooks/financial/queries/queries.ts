// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { AccountsService, AttachmentsService, ClientsService, GoCardlessService, InvoiceTemplatesService, InvoicesService, ReportsService, SchedulerService, SetupService, SyncService, TransactionsService } from "../requests/services.gen";
import { BulkOperationRequest, CategorizationRequest, CreateClient, CreateInvoice, CreateInvoiceTemplate, EmailRequest, GoCardlessConfig, InvoiceItem, PaymentDetails, SearchQuery, SendInvoiceRequest, UpdateClient, UpdateInvoice, UpdateInvoiceTemplate } from "../requests/types.gen";
import * as Common from "./common";
export const useAccountsServiceListAccounts = <TData = Common.AccountsServiceListAccountsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, page }: {
  limit?: number;
  page?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAccountsServiceListAccountsKeyFn({ limit, page }, queryKey), queryFn: () => AccountsService.listAccounts({ limit, page }) as TData, ...options });
export const useAccountsServiceGetAccount = <TData = Common.AccountsServiceGetAccountDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAccountsServiceGetAccountKeyFn({ id }, queryKey), queryFn: () => AccountsService.getAccount({ id }) as TData, ...options });
export const useAccountsServiceGetAccountStatus = <TData = Common.AccountsServiceGetAccountStatusDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAccountsServiceGetAccountStatusKeyFn(queryKey), queryFn: () => AccountsService.getAccountStatus() as TData, ...options });
export const useClientsServiceListClients = <TData = Common.ClientsServiceListClientsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ email, limit, name, page }: {
  email?: string;
  limit?: number;
  name?: string;
  page?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseClientsServiceListClientsKeyFn({ email, limit, name, page }, queryKey), queryFn: () => ClientsService.listClients({ email, limit, name, page }) as TData, ...options });
export const useClientsServiceGetClientByTaxId = <TData = Common.ClientsServiceGetClientByTaxIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ taxId }: {
  taxId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseClientsServiceGetClientByTaxIdKeyFn({ taxId }, queryKey), queryFn: () => ClientsService.getClientByTaxId({ taxId }) as TData, ...options });
export const useClientsServiceGetClient = <TData = Common.ClientsServiceGetClientDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseClientsServiceGetClientKeyFn({ id }, queryKey), queryFn: () => ClientsService.getClient({ id }) as TData, ...options });
export const useClientsServiceGetClientStats = <TData = Common.ClientsServiceGetClientStatsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseClientsServiceGetClientStatsKeyFn({ id }, queryKey), queryFn: () => ClientsService.getClientStats({ id }) as TData, ...options });
export const useClientsServiceGetClientTransactions = <TData = Common.ClientsServiceGetClientTransactionsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ dateFrom, dateTo, id, limit, page }: {
  dateFrom?: string;
  dateTo?: string;
  id: string;
  limit?: number;
  page?: number;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseClientsServiceGetClientTransactionsKeyFn({ dateFrom, dateTo, id, limit, page }, queryKey), queryFn: () => ClientsService.getClientTransactions({ dateFrom, dateTo, id, limit, page }) as TData, ...options });
export const useInvoicesServiceListInvoices = <TData = Common.InvoicesServiceListInvoicesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ clientId, limit, page, status }: {
  clientId?: string;
  limit?: number;
  page?: number;
  status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseInvoicesServiceListInvoicesKeyFn({ clientId, limit, page, status }, queryKey), queryFn: () => InvoicesService.listInvoices({ clientId, limit, page, status }) as TData, ...options });
export const useInvoicesServiceGetOverdueInvoices = <TData = Common.InvoicesServiceGetOverdueInvoicesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, page }: {
  limit?: number;
  page?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseInvoicesServiceGetOverdueInvoicesKeyFn({ limit, page }, queryKey), queryFn: () => InvoicesService.getOverdueInvoices({ limit, page }) as TData, ...options });
export const useInvoicesServiceGetInvoiceByNumber = <TData = Common.InvoicesServiceGetInvoiceByNumberDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ invoiceNumber }: {
  invoiceNumber: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseInvoicesServiceGetInvoiceByNumberKeyFn({ invoiceNumber }, queryKey), queryFn: () => InvoicesService.getInvoiceByNumber({ invoiceNumber }) as TData, ...options });
export const useInvoicesServiceGetInvoice = <TData = Common.InvoicesServiceGetInvoiceDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseInvoicesServiceGetInvoiceKeyFn({ id }, queryKey), queryFn: () => InvoicesService.getInvoice({ id }) as TData, ...options });
export const useInvoicesServiceDownloadInvoicePdf = <TData = Common.InvoicesServiceDownloadInvoicePdfDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseInvoicesServiceDownloadInvoicePdfKeyFn({ id }, queryKey), queryFn: () => InvoicesService.downloadInvoicePdf({ id }) as TData, ...options });
export const useTransactionsServiceListTransactions = <TData = Common.TransactionsServiceListTransactionsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  maxAmount?: number;
  minAmount?: number;
  page?: number;
  search?: string;
  status?: "cancelled" | "pending" | "confirmed" | "failed";
  type?: "debit" | "credit" | "transfer";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTransactionsServiceListTransactionsKeyFn({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }, queryKey), queryFn: () => TransactionsService.listTransactions({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }) as TData, ...options });
export const useTransactionsServiceGetTransaction = <TData = Common.TransactionsServiceGetTransactionDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTransactionsServiceGetTransactionKeyFn({ id }, queryKey), queryFn: () => TransactionsService.getTransaction({ id }) as TData, ...options });
export const useTransactionsServiceExportTransactions = <TData = Common.TransactionsServiceExportTransactionsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ accountId, dateFrom, dateTo, format }: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: "csv" | "json";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTransactionsServiceExportTransactionsKeyFn({ accountId, dateFrom, dateTo, format }, queryKey), queryFn: () => TransactionsService.exportTransactions({ accountId, dateFrom, dateTo, format }) as TData, ...options });
export const useGoCardlessServiceCheckGoCardlessCredentials = <TData = Common.GoCardlessServiceCheckGoCardlessCredentialsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseGoCardlessServiceCheckGoCardlessCredentialsKeyFn(queryKey), queryFn: () => GoCardlessService.checkGoCardlessCredentials() as TData, ...options });
export const useGoCardlessServiceGetGoCardlessStatus = <TData = Common.GoCardlessServiceGetGoCardlessStatusDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseGoCardlessServiceGetGoCardlessStatusKeyFn(queryKey), queryFn: () => GoCardlessService.getGoCardlessStatus() as TData, ...options });
export const useAttachmentsServiceListAttachments = <TData = Common.AttachmentsServiceListAttachmentsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ fileType, invoiceId, limit, page }: {
  fileType?: string;
  invoiceId?: string;
  limit?: number;
  page?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAttachmentsServiceListAttachmentsKeyFn({ fileType, invoiceId, limit, page }, queryKey), queryFn: () => AttachmentsService.listAttachments({ fileType, invoiceId, limit, page }) as TData, ...options });
export const useAttachmentsServiceGetAttachment = <TData = Common.AttachmentsServiceGetAttachmentDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseAttachmentsServiceGetAttachmentKeyFn({ id }, queryKey), queryFn: () => AttachmentsService.getAttachment({ id }) as TData, ...options });
export const useInvoiceTemplatesServiceListInvoiceTemplates = <TData = Common.InvoiceTemplatesServiceListInvoiceTemplatesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, page, search, sortBy, sortOrder }: {
  limit?: number;
  page?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseInvoiceTemplatesServiceListInvoiceTemplatesKeyFn({ limit, page, search, sortBy, sortOrder }, queryKey), queryFn: () => InvoiceTemplatesService.listInvoiceTemplates({ limit, page, search, sortBy, sortOrder }) as TData, ...options });
export const useInvoiceTemplatesServiceGetInvoiceTemplate = <TData = Common.InvoiceTemplatesServiceGetInvoiceTemplateDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseInvoiceTemplatesServiceGetInvoiceTemplateKeyFn({ id }, queryKey), queryFn: () => InvoiceTemplatesService.getInvoiceTemplate({ id }) as TData, ...options });
export const useReportsServiceGenerateComprehensiveReport = <TData = Common.ReportsServiceGenerateComprehensiveReportDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ accountId, endDate, granularity, includeForecasts, startDate }: {
  accountId?: string;
  endDate?: string;
  granularity?: "daily" | "weekly" | "monthly" | "yearly";
  includeForecasts?: boolean;
  startDate?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseReportsServiceGenerateComprehensiveReportKeyFn({ accountId, endDate, granularity, includeForecasts, startDate }, queryKey), queryFn: () => ReportsService.generateComprehensiveReport({ accountId, endDate, granularity, includeForecasts, startDate }) as TData, ...options });
export const useClientsServiceCreateClient = <TData = Common.ClientsServiceCreateClientMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreateClient;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreateClient;
}, TContext>({ mutationFn: ({ requestBody }) => ClientsService.createClient({ requestBody }) as unknown as Promise<TData>, ...options });
export const useClientsServiceSearchClients = <TData = Common.ClientsServiceSearchClientsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: SearchQuery;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: SearchQuery;
}, TContext>({ mutationFn: ({ requestBody }) => ClientsService.searchClients({ requestBody }) as unknown as Promise<TData>, ...options });
export const useClientsServiceBulkClients = <TData = Common.ClientsServiceBulkClientsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: BulkOperationRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: BulkOperationRequest;
}, TContext>({ mutationFn: ({ requestBody }) => ClientsService.bulkClients({ requestBody }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceCreateInvoice = <TData = Common.InvoicesServiceCreateInvoiceMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreateInvoice;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreateInvoice;
}, TContext>({ mutationFn: ({ requestBody }) => InvoicesService.createInvoice({ requestBody }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceMarkInvoicePaid = <TData = Common.InvoicesServiceMarkInvoicePaidMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: PaymentDetails;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: PaymentDetails;
}, TContext>({ mutationFn: ({ id, requestBody }) => InvoicesService.markInvoicePaid({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceSendInvoice = <TData = Common.InvoicesServiceSendInvoiceMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: SendInvoiceRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: SendInvoiceRequest;
}, TContext>({ mutationFn: ({ id, requestBody }) => InvoicesService.sendInvoice({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceDuplicateInvoice = <TData = Common.InvoicesServiceDuplicateInvoiceMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => InvoicesService.duplicateInvoice({ id }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceAddInvoiceItem = <TData = Common.InvoicesServiceAddInvoiceItemMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: InvoiceItem;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: InvoiceItem;
}, TContext>({ mutationFn: ({ id, requestBody }) => InvoicesService.addInvoiceItem({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceGenerateInvoicePdf = <TData = Common.InvoicesServiceGenerateInvoicePdfMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => InvoicesService.generateInvoicePdf({ id }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceSendInvoiceEmail = <TData = Common.InvoicesServiceSendInvoiceEmailMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: EmailRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: EmailRequest;
}, TContext>({ mutationFn: ({ id, requestBody }) => InvoicesService.sendInvoiceEmail({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useTransactionsServiceImportTransactions = <TData = Common.TransactionsServiceImportTransactionsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  formData: { file: Blob | File; accountId: string; };
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  formData: { file: Blob | File; accountId: string; };
}, TContext>({ mutationFn: ({ formData }) => TransactionsService.importTransactions({ formData }) as unknown as Promise<TData>, ...options });
export const useTransactionsServiceCategorizeTransaction = <TData = Common.TransactionsServiceCategorizeTransactionMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: CategorizationRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: CategorizationRequest;
}, TContext>({ mutationFn: ({ id, requestBody }) => TransactionsService.categorizeTransaction({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useTransactionsServiceAutoCategorizeTransactions = <TData = Common.TransactionsServiceAutoCategorizeTransactionsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: { transactionIds: string[]; };
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: { transactionIds: string[]; };
}, TContext>({ mutationFn: ({ requestBody }) => TransactionsService.autoCategorizeTransactions({ requestBody }) as unknown as Promise<TData>, ...options });
export const useGoCardlessServiceConfigureGoCardlessCredentials = <TData = Common.GoCardlessServiceConfigureGoCardlessCredentialsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: GoCardlessConfig;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: GoCardlessConfig;
}, TContext>({ mutationFn: ({ requestBody }) => GoCardlessService.configureGoCardlessCredentials({ requestBody }) as unknown as Promise<TData>, ...options });
export const useGoCardlessServiceTestGoCardlessConnection = <TData = Common.GoCardlessServiceTestGoCardlessConnectionMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => GoCardlessService.testGoCardlessConnection() as unknown as Promise<TData>, ...options });
export const useGoCardlessServiceDiagnoseGoCardlessIssues = <TData = Common.GoCardlessServiceDiagnoseGoCardlessIssuesMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => GoCardlessService.diagnoseGoCardlessIssues() as unknown as Promise<TData>, ...options });
export const useSetupServiceSetupBbvaConnection = <TData = Common.SetupServiceSetupBbvaConnectionMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => SetupService.setupBbvaConnection() as unknown as Promise<TData>, ...options });
export const useSetupServiceCompleteSetup = <TData = Common.SetupServiceCompleteSetupMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: { requisitionId: string; };
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: { requisitionId: string; };
}, TContext>({ mutationFn: ({ requestBody }) => SetupService.completeSetup({ requestBody }) as unknown as Promise<TData>, ...options });
export const useSyncServiceManualSync = <TData = Common.SyncServiceManualSyncMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => SyncService.manualSync() as unknown as Promise<TData>, ...options });
export const useSyncServiceSyncAccounts = <TData = Common.SyncServiceSyncAccountsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => SyncService.syncAccounts() as unknown as Promise<TData>, ...options });
export const useSyncServiceSyncBalances = <TData = Common.SyncServiceSyncBalancesMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody?: { forceRefresh?: boolean; };
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody?: { forceRefresh?: boolean; };
}, TContext>({ mutationFn: ({ requestBody }) => SyncService.syncBalances({ requestBody }) as unknown as Promise<TData>, ...options });
export const useSyncServiceSyncTransactions = <TData = Common.SyncServiceSyncTransactionsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody?: { days?: number; };
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody?: { days?: number; };
}, TContext>({ mutationFn: ({ requestBody }) => SyncService.syncTransactions({ requestBody }) as unknown as Promise<TData>, ...options });
export const useSchedulerServiceStartScheduler = <TData = Common.SchedulerServiceStartSchedulerMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => SchedulerService.startScheduler() as unknown as Promise<TData>, ...options });
export const useSchedulerServiceStopScheduler = <TData = Common.SchedulerServiceStopSchedulerMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => SchedulerService.stopScheduler() as unknown as Promise<TData>, ...options });
export const useInvoiceTemplatesServiceCreateInvoiceTemplate = <TData = Common.InvoiceTemplatesServiceCreateInvoiceTemplateMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreateInvoiceTemplate;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreateInvoiceTemplate;
}, TContext>({ mutationFn: ({ requestBody }) => InvoiceTemplatesService.createInvoiceTemplate({ requestBody }) as unknown as Promise<TData>, ...options });
export const useClientsServiceUpdateClient = <TData = Common.ClientsServiceUpdateClientMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: UpdateClient;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: UpdateClient;
}, TContext>({ mutationFn: ({ id, requestBody }) => ClientsService.updateClient({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceUpdateInvoice = <TData = Common.InvoicesServiceUpdateInvoiceMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: UpdateInvoice;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: UpdateInvoice;
}, TContext>({ mutationFn: ({ id, requestBody }) => InvoicesService.updateInvoice({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useInvoiceTemplatesServiceUpdateInvoiceTemplate = <TData = Common.InvoiceTemplatesServiceUpdateInvoiceTemplateMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
  requestBody: UpdateInvoiceTemplate;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
  requestBody: UpdateInvoiceTemplate;
}, TContext>({ mutationFn: ({ id, requestBody }) => InvoiceTemplatesService.updateInvoiceTemplate({ id, requestBody }) as unknown as Promise<TData>, ...options });
export const useClientsServiceDeleteClient = <TData = Common.ClientsServiceDeleteClientMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => ClientsService.deleteClient({ id }) as unknown as Promise<TData>, ...options });
export const useInvoicesServiceDeleteInvoice = <TData = Common.InvoicesServiceDeleteInvoiceMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => InvoicesService.deleteInvoice({ id }) as unknown as Promise<TData>, ...options });
export const useTransactionsServiceDeleteTransaction = <TData = Common.TransactionsServiceDeleteTransactionMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => TransactionsService.deleteTransaction({ id }) as unknown as Promise<TData>, ...options });
export const useGoCardlessServiceDeleteGoCardlessCredentials = <TData = Common.GoCardlessServiceDeleteGoCardlessCredentialsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => GoCardlessService.deleteGoCardlessCredentials() as unknown as Promise<TData>, ...options });
export const useInvoiceTemplatesServiceDeleteInvoiceTemplate = <TData = Common.InvoiceTemplatesServiceDeleteInvoiceTemplateMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => InvoiceTemplatesService.deleteInvoiceTemplate({ id }) as unknown as Promise<TData>, ...options });
