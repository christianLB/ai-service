// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { type QueryClient } from "@tanstack/react-query";
import { AccountsService, AttachmentsService, ClientsService, GoCardlessService, InvoiceTemplatesService, InvoicesService, ReportsService, TransactionsService } from "../requests/services.gen";
import * as Common from "./common";
export const prefetchUseAccountsServiceListAccounts = (queryClient: QueryClient, { limit, page }: {
  limit?: number;
  page?: number;
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseAccountsServiceListAccountsKeyFn({ limit, page }), queryFn: () => AccountsService.listAccounts({ limit, page }) });
export const prefetchUseAccountsServiceGetAccount = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseAccountsServiceGetAccountKeyFn({ id }), queryFn: () => AccountsService.getAccount({ id }) });
export const prefetchUseAccountsServiceGetAccountStatus = (queryClient: QueryClient) => queryClient.prefetchQuery({ queryKey: Common.UseAccountsServiceGetAccountStatusKeyFn(), queryFn: () => AccountsService.getAccountStatus() });
export const prefetchUseClientsServiceListClients = (queryClient: QueryClient, { email, limit, name, page }: {
  email?: string;
  limit?: number;
  name?: string;
  page?: number;
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseClientsServiceListClientsKeyFn({ email, limit, name, page }), queryFn: () => ClientsService.listClients({ email, limit, name, page }) });
export const prefetchUseClientsServiceGetClientByTaxId = (queryClient: QueryClient, { taxId }: {
  taxId: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseClientsServiceGetClientByTaxIdKeyFn({ taxId }), queryFn: () => ClientsService.getClientByTaxId({ taxId }) });
export const prefetchUseClientsServiceGetClient = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseClientsServiceGetClientKeyFn({ id }), queryFn: () => ClientsService.getClient({ id }) });
export const prefetchUseClientsServiceGetClientStats = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseClientsServiceGetClientStatsKeyFn({ id }), queryFn: () => ClientsService.getClientStats({ id }) });
export const prefetchUseClientsServiceGetClientTransactions = (queryClient: QueryClient, { dateFrom, dateTo, id, limit, page }: {
  dateFrom?: string;
  dateTo?: string;
  id: string;
  limit?: number;
  page?: number;
}) => queryClient.prefetchQuery({ queryKey: Common.UseClientsServiceGetClientTransactionsKeyFn({ dateFrom, dateTo, id, limit, page }), queryFn: () => ClientsService.getClientTransactions({ dateFrom, dateTo, id, limit, page }) });
export const prefetchUseInvoicesServiceListInvoices = (queryClient: QueryClient, { clientId, limit, page, status }: {
  clientId?: string;
  limit?: number;
  page?: number;
  status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseInvoicesServiceListInvoicesKeyFn({ clientId, limit, page, status }), queryFn: () => InvoicesService.listInvoices({ clientId, limit, page, status }) });
export const prefetchUseInvoicesServiceGetOverdueInvoices = (queryClient: QueryClient, { limit, page }: {
  limit?: number;
  page?: number;
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseInvoicesServiceGetOverdueInvoicesKeyFn({ limit, page }), queryFn: () => InvoicesService.getOverdueInvoices({ limit, page }) });
export const prefetchUseInvoicesServiceGetInvoiceByNumber = (queryClient: QueryClient, { invoiceNumber }: {
  invoiceNumber: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseInvoicesServiceGetInvoiceByNumberKeyFn({ invoiceNumber }), queryFn: () => InvoicesService.getInvoiceByNumber({ invoiceNumber }) });
export const prefetchUseInvoicesServiceGetInvoice = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseInvoicesServiceGetInvoiceKeyFn({ id }), queryFn: () => InvoicesService.getInvoice({ id }) });
export const prefetchUseInvoicesServiceDownloadInvoicePdf = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseInvoicesServiceDownloadInvoicePdfKeyFn({ id }), queryFn: () => InvoicesService.downloadInvoicePdf({ id }) });
export const prefetchUseTransactionsServiceListTransactions = (queryClient: QueryClient, { accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }: {
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
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseTransactionsServiceListTransactionsKeyFn({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }), queryFn: () => TransactionsService.listTransactions({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }) });
export const prefetchUseTransactionsServiceGetTransaction = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseTransactionsServiceGetTransactionKeyFn({ id }), queryFn: () => TransactionsService.getTransaction({ id }) });
export const prefetchUseTransactionsServiceExportTransactions = (queryClient: QueryClient, { accountId, dateFrom, dateTo, format }: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: "csv" | "json";
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseTransactionsServiceExportTransactionsKeyFn({ accountId, dateFrom, dateTo, format }), queryFn: () => TransactionsService.exportTransactions({ accountId, dateFrom, dateTo, format }) });
export const prefetchUseGoCardlessServiceCheckGoCardlessCredentials = (queryClient: QueryClient) => queryClient.prefetchQuery({ queryKey: Common.UseGoCardlessServiceCheckGoCardlessCredentialsKeyFn(), queryFn: () => GoCardlessService.checkGoCardlessCredentials() });
export const prefetchUseGoCardlessServiceGetGoCardlessStatus = (queryClient: QueryClient) => queryClient.prefetchQuery({ queryKey: Common.UseGoCardlessServiceGetGoCardlessStatusKeyFn(), queryFn: () => GoCardlessService.getGoCardlessStatus() });
export const prefetchUseAttachmentsServiceListAttachments = (queryClient: QueryClient, { fileType, invoiceId, limit, page }: {
  fileType?: string;
  invoiceId?: string;
  limit?: number;
  page?: number;
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseAttachmentsServiceListAttachmentsKeyFn({ fileType, invoiceId, limit, page }), queryFn: () => AttachmentsService.listAttachments({ fileType, invoiceId, limit, page }) });
export const prefetchUseAttachmentsServiceGetAttachment = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseAttachmentsServiceGetAttachmentKeyFn({ id }), queryFn: () => AttachmentsService.getAttachment({ id }) });
export const prefetchUseInvoiceTemplatesServiceListInvoiceTemplates = (queryClient: QueryClient, { limit, page, search, sortBy, sortOrder }: {
  limit?: number;
  page?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseInvoiceTemplatesServiceListInvoiceTemplatesKeyFn({ limit, page, search, sortBy, sortOrder }), queryFn: () => InvoiceTemplatesService.listInvoiceTemplates({ limit, page, search, sortBy, sortOrder }) });
export const prefetchUseInvoiceTemplatesServiceGetInvoiceTemplate = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.prefetchQuery({ queryKey: Common.UseInvoiceTemplatesServiceGetInvoiceTemplateKeyFn({ id }), queryFn: () => InvoiceTemplatesService.getInvoiceTemplate({ id }) });
export const prefetchUseReportsServiceGenerateComprehensiveReport = (queryClient: QueryClient, { accountId, endDate, granularity, includeForecasts, startDate }: {
  accountId?: string;
  endDate?: string;
  granularity?: "daily" | "weekly" | "monthly" | "yearly";
  includeForecasts?: boolean;
  startDate?: string;
} = {}) => queryClient.prefetchQuery({ queryKey: Common.UseReportsServiceGenerateComprehensiveReportKeyFn({ accountId, endDate, granularity, includeForecasts, startDate }), queryFn: () => ReportsService.generateComprehensiveReport({ accountId, endDate, granularity, includeForecasts, startDate }) });
