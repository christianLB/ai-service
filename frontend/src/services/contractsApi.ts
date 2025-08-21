import { createGatewayClient } from '@ai/contracts';
import type { GatewayPaths } from '@ai/contracts';

// Create typed API client
const baseURL = import.meta.env.VITE_API_URL || '/api';
export const gatewayClient = createGatewayClient(baseURL);

// Type exports for convenience
export type TransactionListResponse =
  GatewayPaths['/api/financial/transactions']['get']['responses']['200']['content']['application/json'];
export type Transaction = TransactionListResponse['transactions'][0];
export type AttachmentListResponse =
  GatewayPaths['/api/financial/attachments']['get']['responses']['200']['content']['application/json'];
export type Attachment = AttachmentListResponse['attachments'][0];
export type AccountListResponse =
  GatewayPaths['/api/financial/accounts']['get']['responses']['200']['content']['application/json'];
export type Account = AccountListResponse['accounts'][0];
export type ClientListResponse =
  GatewayPaths['/api/financial/clients']['get']['responses']['200']['content']['application/json'];
export type Client = ClientListResponse['clients'][0];
export type InvoiceListResponse =
  GatewayPaths['/api/financial/invoices']['get']['responses']['200']['content']['application/json'];
export type Invoice = InvoiceListResponse['invoices'][0];

// Error handling helper
export function handleApiError(error: unknown): { message: string; code: string } {
  const errorObj = error as {
    response?: { data?: { message?: string; code?: string } };
    message?: string;
  };
  if (errorObj?.response?.data) {
    return errorObj.response.data as { message: string; code: string };
  }
  return {
    message: errorObj?.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}
