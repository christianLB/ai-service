import { z } from 'zod';

// Schema for individual transaction in import
export const importTransactionSchema = z.object({
  transaction_id: z.string().optional(),
  amount: z.string(),
  currency_id: z.string().optional(), // Can be UUID or currency code
  type: z.string().optional().default('bank_transfer'),
  status: z.string().optional().default('confirmed'),
  description: z.string().optional().default(''),
  reference: z.string().nullable().optional(),
  counterparty_name: z.string().nullable().optional(),
  counterparty_account: z.string().nullable().optional(),
  date: z.string(), // More flexible date format
  metadata: z.record(z.any()).optional().default({}),
  tags: z.array(z.string()).optional().default([]),
  fee_amount: z.string().nullable().optional(),
  fee_currency_id: z.string().nullable().optional(), // Can be UUID or currency code
  gocardless_data: z.record(z.any()).nullable().optional(),
  transaction_hash: z.string().nullable().optional(),
  block_number: z.number().nullable().optional(),
  gas_used: z.string().nullable().optional(),
  gas_price: z.string().nullable().optional(),
  from_address: z.string().nullable().optional(),
  to_address: z.string().nullable().optional()
});

// Schema for the import request
export const transactionImportRequestSchema = z.object({
  accountId: z.string().uuid(),
  transactions: z.array(importTransactionSchema).min(1).max(1000)
});

// Schema for file upload (JSON structure)
export const transactionImportFileSchema = z.object({
  metadata: z.object({
    account_id: z.string().uuid().optional(),
    currency_id: z.string().optional(), // Can be UUID or currency code
    total_transactions: z.number().optional()
  }).optional(),
  transactions: z.array(importTransactionSchema).min(1).max(1000)
});

// Types
export type ImportTransaction = z.infer<typeof importTransactionSchema>;
export type TransactionImportRequest = z.infer<typeof transactionImportRequestSchema>;
export type TransactionImportFile = z.infer<typeof transactionImportFileSchema>;

// Response types
export interface TransactionImportResponse {
  success: boolean;
  data?: {
    imported: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
    duplicates: Array<{ row: number; transaction_id: string }>;
    accountId: string;
  };
  error?: string;
  message?: string;
}