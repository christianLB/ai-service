import { z } from 'zod';
import { UUID } from './common';

// Health Check schemas
export const ServiceStatus = z.enum(['healthy', 'degraded', 'error', 'unknown']);

export const HealthStatus = z.object({
  success: z.boolean(),
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  services: z.object({
    database: ServiceStatus,
    gocardless: ServiceStatus,
    scheduler: ServiceStatus,
  }),
  timestamp: z.string().datetime(),
});

// Client Metrics schemas
export const ClientMetrics = z.object({
  totalClients: z.number(),
  activeClients: z.number(),
  newThisMonth: z.number(),
  topClients: z.array(z.object({
    id: UUID,
    name: z.string(),
    revenue: z.number(),
    invoiceCount: z.number(),
  })),
});

// Revenue Metrics schemas
export const RevenueMetrics = z.object({
  currentMonth: z.number(),
  previousMonth: z.number(),
  yearToDate: z.number(),
  growthRate: z.number(),
  monthlyData: z.array(z.object({
    month: z.string(),
    revenue: z.number(),
    invoices: z.number(),
  })),
});

// Invoice Statistics schemas
export const InvoiceStatistics = z.object({
  totalInvoices: z.number(),
  pendingInvoices: z.number(),
  paidInvoices: z.number(),
  overdueInvoices: z.number(),
  totalAmount: z.number(),
  pendingAmount: z.number(),
  paidAmount: z.number(),
  overdueAmount: z.number(),
});

// Cash Flow Projections schemas
export const CashFlowProjections = z.object({
  projections: z.array(z.object({
    month: z.string(),
    income: z.number(),
    expenses: z.number(),
    balance: z.number(),
  })),
  summary: z.object({
    totalIncome: z.number(),
    totalExpenses: z.number(),
    netCashFlow: z.number(),
  }),
});

// Sync Status schemas
export const SyncStatus = z.object({
  scheduler: z.object({
    isActive: z.boolean(),
    nextSync: z.string(),
    lastSync: z.string(),
  }),
  stats: z.object({
    totalSyncs: z.number(),
    successfulSyncs: z.number(),
    failedSyncs: z.number(),
    averageSyncTime: z.number(),
  }),
});

// Account Status schemas
export const AccountStatus = z.object({
  accounts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    iban: z.string(),
    currency: z.string(),
    balance: z.string(),
    institution: z.string(),
    status: z.string(),
    lastSyncedAt: z.string(),
  })),
  totalAccounts: z.number(),
  activeAccounts: z.number(),
});

// Quick Stats schemas
export const QuickStats = z.object({
  revenue: z.object({
    current: z.number(),
    previous: z.number(),
    change: z.number(),
  }),
  invoices: z.object({
    total: z.number(),
    pending: z.number(),
    overdue: z.number(),
  }),
  clients: z.object({
    total: z.number(),
    active: z.number(),
    new: z.number(),
  }),
});

// API Response wrappers
export const ApiResponse = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Export types
export type HealthStatus = z.infer<typeof HealthStatus>;
export type ClientMetrics = z.infer<typeof ClientMetrics>;
export type RevenueMetrics = z.infer<typeof RevenueMetrics>;
export type InvoiceStatistics = z.infer<typeof InvoiceStatistics>;
export type CashFlowProjections = z.infer<typeof CashFlowProjections>;
export type SyncStatus = z.infer<typeof SyncStatus>;
export type AccountStatus = z.infer<typeof AccountStatus>;
export type QuickStats = z.infer<typeof QuickStats>;