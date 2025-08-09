import { z } from 'zod';
export declare const dashboardContract: {
    health: {
        summary: "Check health status of financial services";
        method: "GET";
        path: "/api/financial/health";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                success: z.ZodBoolean;
                data: z.ZodOptional<z.ZodUndefined>;
                error: z.ZodOptional<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }>;
        };
    };
    clientMetrics: {
        summary: "Get client metrics and statistics";
        method: "GET";
        path: "/api/dashboard/client-metrics";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                success: z.ZodBoolean;
                data: z.ZodOptional<z.ZodUndefined>;
                error: z.ZodOptional<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }>;
        };
    };
    revenueMetrics: {
        query: z.ZodObject<{
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            startDate?: string | undefined;
            endDate?: string | undefined;
        }, {
            startDate?: string | undefined;
            endDate?: string | undefined;
        }>;
        summary: "Get revenue metrics and trends";
        method: "GET";
        path: "/api/dashboard/revenue-metrics";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                success: z.ZodBoolean;
                data: z.ZodOptional<z.ZodUndefined>;
                error: z.ZodOptional<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }>;
        };
    };
    invoiceStatistics: {
        summary: "Get invoice statistics";
        method: "GET";
        path: "/api/dashboard/invoice-statistics";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                success: z.ZodBoolean;
                data: z.ZodOptional<z.ZodUndefined>;
                error: z.ZodOptional<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }>;
        };
    };
    cashFlowProjections: {
        query: z.ZodObject<{
            months: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            months?: number | undefined;
        }, {
            months?: number | undefined;
        }>;
        summary: "Get cash flow projections";
        method: "GET";
        path: "/api/dashboard/cash-flow-projections";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                success: z.ZodBoolean;
                data: z.ZodOptional<z.ZodUndefined>;
                error: z.ZodOptional<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }>;
        };
    };
    syncStatus: {
        summary: "Get synchronization status";
        method: "GET";
        path: "/api/dashboard/sync-status";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                success: z.ZodBoolean;
                data: z.ZodOptional<z.ZodUndefined>;
                error: z.ZodOptional<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }>;
        };
    };
    accountStatus: {
        summary: "Get bank account status";
        method: "GET";
        path: "/api/dashboard/account-status";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                success: z.ZodBoolean;
                data: z.ZodOptional<z.ZodUndefined>;
                error: z.ZodOptional<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }>;
        };
    };
    quickStats: {
        summary: "Get quick statistics overview";
        method: "GET";
        path: "/api/dashboard/quick-stats";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                success: z.ZodBoolean;
                data: z.ZodOptional<z.ZodUndefined>;
                error: z.ZodOptional<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }, {
                success: boolean;
                message?: string | undefined;
                error?: string | undefined;
                data?: undefined;
            }>;
        };
    };
};
