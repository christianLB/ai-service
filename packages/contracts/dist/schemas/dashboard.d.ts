import { z } from 'zod';
export declare const ServiceStatus: z.ZodEnum<["healthy", "degraded", "error", "unknown"]>;
export declare const HealthStatus: z.ZodObject<{
    success: z.ZodBoolean;
    status: z.ZodEnum<["healthy", "unhealthy", "degraded"]>;
    services: z.ZodObject<{
        database: z.ZodEnum<["healthy", "degraded", "error", "unknown"]>;
        gocardless: z.ZodEnum<["healthy", "degraded", "error", "unknown"]>;
        scheduler: z.ZodEnum<["healthy", "degraded", "error", "unknown"]>;
    }, "strip", z.ZodTypeAny, {
        database: "unknown" | "healthy" | "degraded" | "error";
        gocardless: "unknown" | "healthy" | "degraded" | "error";
        scheduler: "unknown" | "healthy" | "degraded" | "error";
    }, {
        database: "unknown" | "healthy" | "degraded" | "error";
        gocardless: "unknown" | "healthy" | "degraded" | "error";
        scheduler: "unknown" | "healthy" | "degraded" | "error";
    }>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "healthy" | "unhealthy" | "degraded";
    success: boolean;
    services: {
        database: "unknown" | "healthy" | "degraded" | "error";
        gocardless: "unknown" | "healthy" | "degraded" | "error";
        scheduler: "unknown" | "healthy" | "degraded" | "error";
    };
    timestamp: string;
}, {
    status: "healthy" | "unhealthy" | "degraded";
    success: boolean;
    services: {
        database: "unknown" | "healthy" | "degraded" | "error";
        gocardless: "unknown" | "healthy" | "degraded" | "error";
        scheduler: "unknown" | "healthy" | "degraded" | "error";
    };
    timestamp: string;
}>;
export declare const ClientMetrics: z.ZodObject<{
    totalClients: z.ZodNumber;
    activeClients: z.ZodNumber;
    newThisMonth: z.ZodNumber;
    topClients: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        revenue: z.ZodNumber;
        invoiceCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        revenue: number;
        invoiceCount: number;
    }, {
        id: string;
        name: string;
        revenue: number;
        invoiceCount: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    totalClients: number;
    activeClients: number;
    newThisMonth: number;
    topClients: {
        id: string;
        name: string;
        revenue: number;
        invoiceCount: number;
    }[];
}, {
    totalClients: number;
    activeClients: number;
    newThisMonth: number;
    topClients: {
        id: string;
        name: string;
        revenue: number;
        invoiceCount: number;
    }[];
}>;
export declare const RevenueMetrics: z.ZodObject<{
    currentMonth: z.ZodNumber;
    previousMonth: z.ZodNumber;
    yearToDate: z.ZodNumber;
    growthRate: z.ZodNumber;
    monthlyData: z.ZodArray<z.ZodObject<{
        month: z.ZodString;
        revenue: z.ZodNumber;
        invoices: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        revenue: number;
        month: string;
        invoices: number;
    }, {
        revenue: number;
        month: string;
        invoices: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currentMonth: number;
    previousMonth: number;
    yearToDate: number;
    growthRate: number;
    monthlyData: {
        revenue: number;
        month: string;
        invoices: number;
    }[];
}, {
    currentMonth: number;
    previousMonth: number;
    yearToDate: number;
    growthRate: number;
    monthlyData: {
        revenue: number;
        month: string;
        invoices: number;
    }[];
}>;
export declare const InvoiceStatistics: z.ZodObject<{
    totalInvoices: z.ZodNumber;
    pendingInvoices: z.ZodNumber;
    paidInvoices: z.ZodNumber;
    overdueInvoices: z.ZodNumber;
    totalAmount: z.ZodNumber;
    pendingAmount: z.ZodNumber;
    paidAmount: z.ZodNumber;
    overdueAmount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalInvoices: number;
    pendingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
    overdueAmount: number;
}, {
    totalInvoices: number;
    pendingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
    overdueAmount: number;
}>;
export declare const CashFlowProjections: z.ZodObject<{
    projections: z.ZodArray<z.ZodObject<{
        month: z.ZodString;
        income: z.ZodNumber;
        expenses: z.ZodNumber;
        balance: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        month: string;
        income: number;
        expenses: number;
        balance: number;
    }, {
        month: string;
        income: number;
        expenses: number;
        balance: number;
    }>, "many">;
    summary: z.ZodObject<{
        totalIncome: z.ZodNumber;
        totalExpenses: z.ZodNumber;
        netCashFlow: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalIncome: number;
        totalExpenses: number;
        netCashFlow: number;
    }, {
        totalIncome: number;
        totalExpenses: number;
        netCashFlow: number;
    }>;
}, "strip", z.ZodTypeAny, {
    summary: {
        totalIncome: number;
        totalExpenses: number;
        netCashFlow: number;
    };
    projections: {
        month: string;
        income: number;
        expenses: number;
        balance: number;
    }[];
}, {
    summary: {
        totalIncome: number;
        totalExpenses: number;
        netCashFlow: number;
    };
    projections: {
        month: string;
        income: number;
        expenses: number;
        balance: number;
    }[];
}>;
export declare const SyncStatus: z.ZodObject<{
    scheduler: z.ZodObject<{
        isActive: z.ZodBoolean;
        nextSync: z.ZodString;
        lastSync: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        isActive: boolean;
        nextSync: string;
        lastSync: string;
    }, {
        isActive: boolean;
        nextSync: string;
        lastSync: string;
    }>;
    stats: z.ZodObject<{
        totalSyncs: z.ZodNumber;
        successfulSyncs: z.ZodNumber;
        failedSyncs: z.ZodNumber;
        averageSyncTime: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalSyncs: number;
        successfulSyncs: number;
        failedSyncs: number;
        averageSyncTime: number;
    }, {
        totalSyncs: number;
        successfulSyncs: number;
        failedSyncs: number;
        averageSyncTime: number;
    }>;
}, "strip", z.ZodTypeAny, {
    scheduler: {
        isActive: boolean;
        nextSync: string;
        lastSync: string;
    };
    stats: {
        totalSyncs: number;
        successfulSyncs: number;
        failedSyncs: number;
        averageSyncTime: number;
    };
}, {
    scheduler: {
        isActive: boolean;
        nextSync: string;
        lastSync: string;
    };
    stats: {
        totalSyncs: number;
        successfulSyncs: number;
        failedSyncs: number;
        averageSyncTime: number;
    };
}>;
export declare const AccountStatus: z.ZodObject<{
    accounts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        iban: z.ZodString;
        currency: z.ZodString;
        balance: z.ZodString;
        institution: z.ZodString;
        status: z.ZodString;
        lastSyncedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        name: string;
        balance: string;
        iban: string;
        currency: string;
        institution: string;
        lastSyncedAt: string;
    }, {
        status: string;
        id: string;
        name: string;
        balance: string;
        iban: string;
        currency: string;
        institution: string;
        lastSyncedAt: string;
    }>, "many">;
    totalAccounts: z.ZodNumber;
    activeAccounts: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    accounts: {
        status: string;
        id: string;
        name: string;
        balance: string;
        iban: string;
        currency: string;
        institution: string;
        lastSyncedAt: string;
    }[];
    totalAccounts: number;
    activeAccounts: number;
}, {
    accounts: {
        status: string;
        id: string;
        name: string;
        balance: string;
        iban: string;
        currency: string;
        institution: string;
        lastSyncedAt: string;
    }[];
    totalAccounts: number;
    activeAccounts: number;
}>;
export declare const QuickStats: z.ZodObject<{
    revenue: z.ZodObject<{
        current: z.ZodNumber;
        previous: z.ZodNumber;
        change: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        current: number;
        previous: number;
        change: number;
    }, {
        current: number;
        previous: number;
        change: number;
    }>;
    invoices: z.ZodObject<{
        total: z.ZodNumber;
        pending: z.ZodNumber;
        overdue: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        total: number;
        pending: number;
        overdue: number;
    }, {
        total: number;
        pending: number;
        overdue: number;
    }>;
    clients: z.ZodObject<{
        total: z.ZodNumber;
        active: z.ZodNumber;
        new: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        total: number;
        active: number;
        new: number;
    }, {
        total: number;
        active: number;
        new: number;
    }>;
}, "strip", z.ZodTypeAny, {
    revenue: {
        current: number;
        previous: number;
        change: number;
    };
    invoices: {
        total: number;
        pending: number;
        overdue: number;
    };
    clients: {
        total: number;
        active: number;
        new: number;
    };
}, {
    revenue: {
        current: number;
        previous: number;
        change: number;
    };
    invoices: {
        total: number;
        pending: number;
        overdue: number;
    };
    clients: {
        total: number;
        active: number;
        new: number;
    };
}>;
export declare const ApiResponse: <T extends z.ZodType>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export type HealthStatus = z.infer<typeof HealthStatus>;
export type ClientMetrics = z.infer<typeof ClientMetrics>;
export type RevenueMetrics = z.infer<typeof RevenueMetrics>;
export type InvoiceStatistics = z.infer<typeof InvoiceStatistics>;
export type CashFlowProjections = z.infer<typeof CashFlowProjections>;
export type SyncStatus = z.infer<typeof SyncStatus>;
export type AccountStatus = z.infer<typeof AccountStatus>;
export type QuickStats = z.infer<typeof QuickStats>;
