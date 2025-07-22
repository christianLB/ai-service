/**
 * Financial types re-exported from the financial service types
 * This provides a central import location for financial types
 */

// Import Prisma Client type from our lib
import type { Client as PrismaClientModel } from '../../lib/prisma';

// Re-export as Client
export type Client = PrismaClientModel;

export type {
  
  // Invoice related types
  Invoice,
  InvoiceStatus,
  InvoiceItem,
  
  // Transaction related types
  Transaction,
  TransactionType,
  TransactionStatus,
  
  // Account related types
  Account,
  AccountType,
  
  // Currency related types
  Currency,
  
  // Response types
  FinancialApiResponse,
  PaginatedResponse,
  
  // Category related types
  Category,
  CategoryType,
  Subcategory,
  TransactionCategorization,
  CategorizationMethod,
  
  // Reporting types
  CategorizedTransaction,
  CategorySummary,
  FinancialReport,
  RealtimeMetrics,
  FinancialAlert,
} from '../../services/financial/types';

// Client form data interface matching the Prisma schema
export interface ClientFormData {
  name: string;
  email: string;
  phone?: string;
  taxId: string;
  taxIdType?: string;
  businessName?: string;
  clientType?: string;
  address?: any;
  currency?: string;
  language?: string;
  timezone?: string;
  paymentTerms?: number;
  paymentMethod?: string;
  bankAccount?: string;
  creditLimit?: number;
  notes?: string;
  status?: string;
  customFields?: Record<string, any>;
  metadata?: Record<string, any>; // For backwards compatibility
  tags?: string[];
}

// Re-export Customer as Client for backwards compatibility
export type { Customer as ClientType } from '../../services/financial/types';