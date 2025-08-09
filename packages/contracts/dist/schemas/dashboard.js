"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = exports.QuickStats = exports.AccountStatus = exports.SyncStatus = exports.CashFlowProjections = exports.InvoiceStatistics = exports.RevenueMetrics = exports.ClientMetrics = exports.HealthStatus = exports.ServiceStatus = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
// Health Check schemas
exports.ServiceStatus = zod_1.z.enum(['healthy', 'degraded', 'error', 'unknown']);
exports.HealthStatus = zod_1.z.object({
    success: zod_1.z.boolean(),
    status: zod_1.z.enum(['healthy', 'unhealthy', 'degraded']),
    services: zod_1.z.object({
        database: exports.ServiceStatus,
        gocardless: exports.ServiceStatus,
        scheduler: exports.ServiceStatus,
    }),
    timestamp: zod_1.z.string().datetime(),
});
// Client Metrics schemas
exports.ClientMetrics = zod_1.z.object({
    totalClients: zod_1.z.number(),
    activeClients: zod_1.z.number(),
    newThisMonth: zod_1.z.number(),
    topClients: zod_1.z.array(zod_1.z.object({
        id: common_1.UUID,
        name: zod_1.z.string(),
        revenue: zod_1.z.number(),
        invoiceCount: zod_1.z.number(),
    })),
});
// Revenue Metrics schemas
exports.RevenueMetrics = zod_1.z.object({
    currentMonth: zod_1.z.number(),
    previousMonth: zod_1.z.number(),
    yearToDate: zod_1.z.number(),
    growthRate: zod_1.z.number(),
    monthlyData: zod_1.z.array(zod_1.z.object({
        month: zod_1.z.string(),
        revenue: zod_1.z.number(),
        invoices: zod_1.z.number(),
    })),
});
// Invoice Statistics schemas
exports.InvoiceStatistics = zod_1.z.object({
    totalInvoices: zod_1.z.number(),
    pendingInvoices: zod_1.z.number(),
    paidInvoices: zod_1.z.number(),
    overdueInvoices: zod_1.z.number(),
    totalAmount: zod_1.z.number(),
    pendingAmount: zod_1.z.number(),
    paidAmount: zod_1.z.number(),
    overdueAmount: zod_1.z.number(),
});
// Cash Flow Projections schemas
exports.CashFlowProjections = zod_1.z.object({
    projections: zod_1.z.array(zod_1.z.object({
        month: zod_1.z.string(),
        income: zod_1.z.number(),
        expenses: zod_1.z.number(),
        balance: zod_1.z.number(),
    })),
    summary: zod_1.z.object({
        totalIncome: zod_1.z.number(),
        totalExpenses: zod_1.z.number(),
        netCashFlow: zod_1.z.number(),
    }),
});
// Sync Status schemas
exports.SyncStatus = zod_1.z.object({
    scheduler: zod_1.z.object({
        isActive: zod_1.z.boolean(),
        nextSync: zod_1.z.string(),
        lastSync: zod_1.z.string(),
    }),
    stats: zod_1.z.object({
        totalSyncs: zod_1.z.number(),
        successfulSyncs: zod_1.z.number(),
        failedSyncs: zod_1.z.number(),
        averageSyncTime: zod_1.z.number(),
    }),
});
// Account Status schemas
exports.AccountStatus = zod_1.z.object({
    accounts: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        iban: zod_1.z.string(),
        currency: zod_1.z.string(),
        balance: zod_1.z.string(),
        institution: zod_1.z.string(),
        status: zod_1.z.string(),
        lastSyncedAt: zod_1.z.string(),
    })),
    totalAccounts: zod_1.z.number(),
    activeAccounts: zod_1.z.number(),
});
// Quick Stats schemas
exports.QuickStats = zod_1.z.object({
    revenue: zod_1.z.object({
        current: zod_1.z.number(),
        previous: zod_1.z.number(),
        change: zod_1.z.number(),
    }),
    invoices: zod_1.z.object({
        total: zod_1.z.number(),
        pending: zod_1.z.number(),
        overdue: zod_1.z.number(),
    }),
    clients: zod_1.z.object({
        total: zod_1.z.number(),
        active: zod_1.z.number(),
        new: zod_1.z.number(),
    }),
});
// API Response wrappers
const ApiResponse = (dataSchema) => zod_1.z.object({
    success: zod_1.z.boolean(),
    data: dataSchema.optional(),
    error: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
});
exports.ApiResponse = ApiResponse;
