// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { type QueryClient } from "@tanstack/react-query";
import { AccountsService, AttachmentsService, ClientsService, GoCardlessService, InvoiceTemplatesService, InvoicesService, ReportsService, TransactionsService } from "../requests/services.gen";
import * as Common from "./common";
export const ensureUseAccountsServiceListAccountsData = (queryClient: QueryClient, { limit, page }: {
  limit?: number;
  page?: number;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseAccountsServiceListAccountsKeyFn({ limit, page }), queryFn: () => AccountsService.listAccounts({ limit, page }) });
export const ensureUseAccountsServiceGetAccountData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseAccountsServiceGetAccountKeyFn({ id }), queryFn: () => AccountsService.getAccount({ id }) });
export const ensureUseAccountsServiceGetAccountStatusData = (queryClient: QueryClient) => queryClient.ensureQueryData({ queryKey: Common.UseAccountsServiceGetAccountStatusKeyFn(), queryFn: () => AccountsService.getAccountStatus() });
export const ensureUseClientsServiceListClientsData = (queryClient: QueryClient, { email, limit, name, page }: {
  email?: string;
  limit?: number;
  name?: string;
  page?: number;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseClientsServiceListClientsKeyFn({ email, limit, name, page }), queryFn: () => ClientsService.listClients({ email, limit, name, page }) });
export const ensureUseClientsServiceGetClientByTaxIdData = (queryClient: QueryClient, { taxId }: {
  taxId: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseClientsServiceGetClientByTaxIdKeyFn({ taxId }), queryFn: () => ClientsService.getClientByTaxId({ taxId }) });
export const ensureUseClientsServiceGetClientData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseClientsServiceGetClientKeyFn({ id }), queryFn: () => ClientsService.getClient({ id }) });
export const ensureUseClientsServiceGetClientStatsData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseClientsServiceGetClientStatsKeyFn({ id }), queryFn: () => ClientsService.getClientStats({ id }) });
export const ensureUseClientsServiceGetClientTransactionsData = (queryClient: QueryClient, { dateFrom, dateTo, id, limit, page }: {
  dateFrom?: string;
  dateTo?: string;
  id: string;
  limit?: number;
  page?: number;
}) => queryClient.ensureQueryData({ queryKey: Common.UseClientsServiceGetClientTransactionsKeyFn({ dateFrom, dateTo, id, limit, page }), queryFn: () => ClientsService.getClientTransactions({ dateFrom, dateTo, id, limit, page }) });
export const ensureUseInvoicesServiceListInvoicesData = (queryClient: QueryClient, { clientId, limit, page, status }: {
  clientId?: string;
  limit?: number;
  page?: number;
  status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseInvoicesServiceListInvoicesKeyFn({ clientId, limit, page, status }), queryFn: () => InvoicesService.listInvoices({ clientId, limit, page, status }) });
export const ensureUseInvoicesServiceGetOverdueInvoicesData = (queryClient: QueryClient, { limit, page }: {
  limit?: number;
  page?: number;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseInvoicesServiceGetOverdueInvoicesKeyFn({ limit, page }), queryFn: () => InvoicesService.getOverdueInvoices({ limit, page }) });
export const ensureUseInvoicesServiceGetInvoiceByNumberData = (queryClient: QueryClient, { invoiceNumber }: {
  invoiceNumber: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseInvoicesServiceGetInvoiceByNumberKeyFn({ invoiceNumber }), queryFn: () => InvoicesService.getInvoiceByNumber({ invoiceNumber }) });
export const ensureUseInvoicesServiceGetInvoiceData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseInvoicesServiceGetInvoiceKeyFn({ id }), queryFn: () => InvoicesService.getInvoice({ id }) });
export const ensureUseInvoicesServiceDownloadInvoicePdfData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseInvoicesServiceDownloadInvoicePdfKeyFn({ id }), queryFn: () => InvoicesService.downloadInvoicePdf({ id }) });
export const ensureUseTransactionsServiceListTransactionsData = (queryClient: QueryClient, { accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }: {
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
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseTransactionsServiceListTransactionsKeyFn({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }), queryFn: () => TransactionsService.listTransactions({ accountId, dateFrom, dateTo, limit, maxAmount, minAmount, page, search, status, type }) });
export const ensureUseTransactionsServiceGetTransactionData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseTransactionsServiceGetTransactionKeyFn({ id }), queryFn: () => TransactionsService.getTransaction({ id }) });
export const ensureUseTransactionsServiceExportTransactionsData = (queryClient: QueryClient, { accountId, dateFrom, dateTo, format }: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: "csv" | "json";
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseTransactionsServiceExportTransactionsKeyFn({ accountId, dateFrom, dateTo, format }), queryFn: () => TransactionsService.exportTransactions({ accountId, dateFrom, dateTo, format }) });
export const ensureUseGoCardlessServiceCheckGoCardlessCredentialsData = (queryClient: QueryClient) => queryClient.ensureQueryData({ queryKey: Common.UseGoCardlessServiceCheckGoCardlessCredentialsKeyFn(), queryFn: () => GoCardlessService.checkGoCardlessCredentials() });
export const ensureUseGoCardlessServiceGetGoCardlessStatusData = (queryClient: QueryClient) => queryClient.ensureQueryData({ queryKey: Common.UseGoCardlessServiceGetGoCardlessStatusKeyFn(), queryFn: () => GoCardlessService.getGoCardlessStatus() });
export const ensureUseAttachmentsServiceListAttachmentsData = (queryClient: QueryClient, { fileType, invoiceId, limit, page }: {
  fileType?: string;
  invoiceId?: string;
  limit?: number;
  page?: number;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseAttachmentsServiceListAttachmentsKeyFn({ fileType, invoiceId, limit, page }), queryFn: () => AttachmentsService.listAttachments({ fileType, invoiceId, limit, page }) });
export const ensureUseAttachmentsServiceGetAttachmentData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseAttachmentsServiceGetAttachmentKeyFn({ id }), queryFn: () => AttachmentsService.getAttachment({ id }) });
export const ensureUseInvoiceTemplatesServiceListInvoiceTemplatesData = (queryClient: QueryClient, { limit, page, search, sortBy, sortOrder }: {
  limit?: number;
  page?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseInvoiceTemplatesServiceListInvoiceTemplatesKeyFn({ limit, page, search, sortBy, sortOrder }), queryFn: () => InvoiceTemplatesService.listInvoiceTemplates({ limit, page, search, sortBy, sortOrder }) });
export const ensureUseInvoiceTemplatesServiceGetInvoiceTemplateData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseInvoiceTemplatesServiceGetInvoiceTemplateKeyFn({ id }), queryFn: () => InvoiceTemplatesService.getInvoiceTemplate({ id }) });
export const ensureUseReportsServiceGenerateComprehensiveReportData = (queryClient: QueryClient, { accountId, endDate, granularity, includeForecasts, startDate }: {
  accountId?: string;
  endDate?: string;
  granularity?: "daily" | "weekly" | "monthly" | "yearly";
  includeForecasts?: boolean;
  startDate?: string;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseReportsServiceGenerateComprehensiveReportKeyFn({ accountId, endDate, granularity, includeForecasts, startDate }), queryFn: () => ReportsService.generateComprehensiveReport({ accountId, endDate, granularity, includeForecasts, startDate }) });
