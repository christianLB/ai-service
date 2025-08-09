export * as CommonSchemas from './schemas/common';
export * as FinanceSchemas from './schemas/finance';
export * as DashboardSchemas from './schemas/dashboard';
export { financialContract } from './contracts/financial';
export { dashboardContract } from './contracts/dashboard';
export declare const apiContract: {
    financial: {
        listAccounts: {
            query: import("zod").ZodObject<{
                provider: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodTypeAny, {
                provider?: string | undefined;
            }, {
                provider?: string | undefined;
            }>;
            summary: "List accounts";
            method: "GET";
            path: "/api/financial/accounts";
            responses: {
                200: import("zod").ZodObject<{
                    accounts: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        provider: import("zod").ZodString;
                        name: import("zod").ZodString;
                        iban: import("zod").ZodOptional<import("zod").ZodString>;
                        currency: import("zod").ZodString;
                        createdAt: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                        currency: string;
                        provider: string;
                        iban?: string | undefined;
                        createdAt?: string | undefined;
                    }, {
                        id: string;
                        name: string;
                        currency: string;
                        provider: string;
                        iban?: string | undefined;
                        createdAt?: string | undefined;
                    }>, "many">;
                    total: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
                    accounts: {
                        id: string;
                        name: string;
                        currency: string;
                        provider: string;
                        iban?: string | undefined;
                        createdAt?: string | undefined;
                    }[];
                    total: number;
                }, {
                    accounts: {
                        id: string;
                        name: string;
                        currency: string;
                        provider: string;
                        iban?: string | undefined;
                        createdAt?: string | undefined;
                    }[];
                    total: number;
                }>;
            };
        };
        listAttachments: {
            pathParams: import("zod").ZodObject<{
                invoiceId: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                invoiceId: string;
            }, {
                invoiceId: string;
            }>;
            query: import("zod").ZodObject<{
                userId: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodTypeAny, {
                userId?: string | undefined;
            }, {
                userId?: string | undefined;
            }>;
            summary: "List attachments for an invoice";
            method: "GET";
            path: "/api/financial/:invoiceId/attachments";
            responses: {
                200: import("zod").ZodObject<{
                    attachments: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        invoiceId: import("zod").ZodString;
                        fileName: import("zod").ZodString;
                        fileType: import("zod").ZodString;
                        fileSize: import("zod").ZodNumber;
                        description: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
                        uploadedBy: import("zod").ZodString;
                        uploadedAt: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        invoiceId: string;
                        fileName: string;
                        fileType: string;
                        fileSize: number;
                        uploadedBy: string;
                        uploadedAt: string;
                        description?: string | null | undefined;
                    }, {
                        id: string;
                        invoiceId: string;
                        fileName: string;
                        fileType: string;
                        fileSize: number;
                        uploadedBy: string;
                        uploadedAt: string;
                        description?: string | null | undefined;
                    }>, "many">;
                    total: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
                    total: number;
                    attachments: {
                        id: string;
                        invoiceId: string;
                        fileName: string;
                        fileType: string;
                        fileSize: number;
                        uploadedBy: string;
                        uploadedAt: string;
                        description?: string | null | undefined;
                    }[];
                }, {
                    total: number;
                    attachments: {
                        id: string;
                        invoiceId: string;
                        fileName: string;
                        fileType: string;
                        fileSize: number;
                        uploadedBy: string;
                        uploadedAt: string;
                        description?: string | null | undefined;
                    }[];
                }>;
                500: import("zod").ZodObject<{
                    error: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    error: string;
                }, {
                    error: string;
                }>;
            };
        };
        uploadAttachment: {
            pathParams: import("zod").ZodObject<{
                invoiceId: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                invoiceId: string;
            }, {
                invoiceId: string;
            }>;
            summary: "Upload attachment for an invoice";
            method: "POST";
            contentType: "multipart/form-data";
            body: import("zod").ZodObject<{
                file: import("zod").ZodAny;
                description: import("zod").ZodOptional<import("zod").ZodString>;
                checksum: import("zod").ZodOptional<import("zod").ZodString>;
                userId: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodTypeAny, {
                description?: string | undefined;
                userId?: string | undefined;
                file?: any;
                checksum?: string | undefined;
            }, {
                description?: string | undefined;
                userId?: string | undefined;
                file?: any;
                checksum?: string | undefined;
            }>;
            path: "/api/financial/:invoiceId/attachments";
            responses: {
                201: import("zod").ZodObject<{
                    attachment: import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        invoiceId: import("zod").ZodString;
                        fileName: import("zod").ZodString;
                        fileType: import("zod").ZodString;
                        fileSize: import("zod").ZodNumber;
                        description: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
                        uploadedBy: import("zod").ZodString;
                        uploadedAt: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        invoiceId: string;
                        fileName: string;
                        fileType: string;
                        fileSize: number;
                        uploadedBy: string;
                        uploadedAt: string;
                        description?: string | null | undefined;
                    }, {
                        id: string;
                        invoiceId: string;
                        fileName: string;
                        fileType: string;
                        fileSize: number;
                        uploadedBy: string;
                        uploadedAt: string;
                        description?: string | null | undefined;
                    }>;
                }, "strip", import("zod").ZodTypeAny, {
                    attachment: {
                        id: string;
                        invoiceId: string;
                        fileName: string;
                        fileType: string;
                        fileSize: number;
                        uploadedBy: string;
                        uploadedAt: string;
                        description?: string | null | undefined;
                    };
                }, {
                    attachment: {
                        id: string;
                        invoiceId: string;
                        fileName: string;
                        fileType: string;
                        fileSize: number;
                        uploadedBy: string;
                        uploadedAt: string;
                        description?: string | null | undefined;
                    };
                }>;
                400: import("zod").ZodObject<{
                    error: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    error: string;
                }, {
                    error: string;
                }>;
                500: import("zod").ZodObject<{
                    error: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    error: string;
                }, {
                    error: string;
                }>;
            };
        };
        downloadAttachment: {
            pathParams: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            query: import("zod").ZodObject<{
                userId: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodTypeAny, {
                userId?: string | undefined;
            }, {
                userId?: string | undefined;
            }>;
            summary: "Download attachment by id";
            method: "GET";
            path: "/api/financial/attachment/:id/download";
            responses: {
                200: import("zod").ZodAny;
                404: import("zod").ZodObject<{
                    error: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    error: string;
                }, {
                    error: string;
                }>;
                500: import("zod").ZodObject<{
                    error: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    error: string;
                }, {
                    error: string;
                }>;
            };
        };
        health: {
            summary: "Check health status of financial services";
            method: "GET";
            path: "/api/financial/health";
            responses: {
                200: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    status: import("zod").ZodEnum<["healthy", "unhealthy", "degraded"]>;
                    services: import("zod").ZodObject<{
                        database: import("zod").ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                        gocardless: import("zod").ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                        scheduler: import("zod").ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                    }, "strip", import("zod").ZodTypeAny, {
                        database: "unknown" | "healthy" | "degraded" | "error";
                        gocardless: "unknown" | "healthy" | "degraded" | "error";
                        scheduler: "unknown" | "healthy" | "degraded" | "error";
                    }, {
                        database: "unknown" | "healthy" | "degraded" | "error";
                        gocardless: "unknown" | "healthy" | "degraded" | "error";
                        scheduler: "unknown" | "healthy" | "degraded" | "error";
                    }>;
                    timestamp: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    error: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    error: string;
                }, {
                    error: string;
                }>;
            };
        };
    };
    dashboard: {
        health: {
            summary: "Check health status of financial services";
            method: "GET";
            path: "/api/financial/health";
            responses: {
                200: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    status: import("zod").ZodEnum<["healthy", "unhealthy", "degraded"]>;
                    services: import("zod").ZodObject<{
                        database: import("zod").ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                        gocardless: import("zod").ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                        scheduler: import("zod").ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                    }, "strip", import("zod").ZodTypeAny, {
                        database: "unknown" | "healthy" | "degraded" | "error";
                        gocardless: "unknown" | "healthy" | "degraded" | "error";
                        scheduler: "unknown" | "healthy" | "degraded" | "error";
                    }, {
                        database: "unknown" | "healthy" | "degraded" | "error";
                        gocardless: "unknown" | "healthy" | "degraded" | "error";
                        scheduler: "unknown" | "healthy" | "degraded" | "error";
                    }>;
                    timestamp: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    data: import("zod").ZodOptional<import("zod").ZodUndefined>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    message: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                200: import("zod").ZodObject<{
                    totalClients: import("zod").ZodNumber;
                    activeClients: import("zod").ZodNumber;
                    newThisMonth: import("zod").ZodNumber;
                    topClients: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                        revenue: import("zod").ZodNumber;
                        invoiceCount: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
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
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    data: import("zod").ZodOptional<import("zod").ZodUndefined>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    message: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
            query: import("zod").ZodObject<{
                startDate: import("zod").ZodOptional<import("zod").ZodString>;
                endDate: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodTypeAny, {
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
                200: import("zod").ZodObject<{
                    currentMonth: import("zod").ZodNumber;
                    previousMonth: import("zod").ZodNumber;
                    yearToDate: import("zod").ZodNumber;
                    growthRate: import("zod").ZodNumber;
                    monthlyData: import("zod").ZodArray<import("zod").ZodObject<{
                        month: import("zod").ZodString;
                        revenue: import("zod").ZodNumber;
                        invoices: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        revenue: number;
                        month: string;
                        invoices: number;
                    }, {
                        revenue: number;
                        month: string;
                        invoices: number;
                    }>, "many">;
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    data: import("zod").ZodOptional<import("zod").ZodUndefined>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    message: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                200: import("zod").ZodObject<{
                    totalInvoices: import("zod").ZodNumber;
                    pendingInvoices: import("zod").ZodNumber;
                    paidInvoices: import("zod").ZodNumber;
                    overdueInvoices: import("zod").ZodNumber;
                    totalAmount: import("zod").ZodNumber;
                    pendingAmount: import("zod").ZodNumber;
                    paidAmount: import("zod").ZodNumber;
                    overdueAmount: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    data: import("zod").ZodOptional<import("zod").ZodUndefined>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    message: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
            query: import("zod").ZodObject<{
                months: import("zod").ZodOptional<import("zod").ZodNumber>;
            }, "strip", import("zod").ZodTypeAny, {
                months?: number | undefined;
            }, {
                months?: number | undefined;
            }>;
            summary: "Get cash flow projections";
            method: "GET";
            path: "/api/dashboard/cash-flow-projections";
            responses: {
                200: import("zod").ZodObject<{
                    projections: import("zod").ZodArray<import("zod").ZodObject<{
                        month: import("zod").ZodString;
                        income: import("zod").ZodNumber;
                        expenses: import("zod").ZodNumber;
                        balance: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    summary: import("zod").ZodObject<{
                        totalIncome: import("zod").ZodNumber;
                        totalExpenses: import("zod").ZodNumber;
                        netCashFlow: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        totalIncome: number;
                        totalExpenses: number;
                        netCashFlow: number;
                    }, {
                        totalIncome: number;
                        totalExpenses: number;
                        netCashFlow: number;
                    }>;
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    data: import("zod").ZodOptional<import("zod").ZodUndefined>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    message: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                200: import("zod").ZodObject<{
                    scheduler: import("zod").ZodObject<{
                        isActive: import("zod").ZodBoolean;
                        nextSync: import("zod").ZodString;
                        lastSync: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        isActive: boolean;
                        nextSync: string;
                        lastSync: string;
                    }, {
                        isActive: boolean;
                        nextSync: string;
                        lastSync: string;
                    }>;
                    stats: import("zod").ZodObject<{
                        totalSyncs: import("zod").ZodNumber;
                        successfulSyncs: import("zod").ZodNumber;
                        failedSyncs: import("zod").ZodNumber;
                        averageSyncTime: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
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
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    data: import("zod").ZodOptional<import("zod").ZodUndefined>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    message: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                200: import("zod").ZodObject<{
                    accounts: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                        iban: import("zod").ZodString;
                        currency: import("zod").ZodString;
                        balance: import("zod").ZodString;
                        institution: import("zod").ZodString;
                        status: import("zod").ZodString;
                        lastSyncedAt: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    totalAccounts: import("zod").ZodNumber;
                    activeAccounts: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    data: import("zod").ZodOptional<import("zod").ZodUndefined>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    message: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                200: import("zod").ZodObject<{
                    revenue: import("zod").ZodObject<{
                        current: import("zod").ZodNumber;
                        previous: import("zod").ZodNumber;
                        change: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        current: number;
                        previous: number;
                        change: number;
                    }, {
                        current: number;
                        previous: number;
                        change: number;
                    }>;
                    invoices: import("zod").ZodObject<{
                        total: import("zod").ZodNumber;
                        pending: import("zod").ZodNumber;
                        overdue: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        total: number;
                        pending: number;
                        overdue: number;
                    }, {
                        total: number;
                        pending: number;
                        overdue: number;
                    }>;
                    clients: import("zod").ZodObject<{
                        total: import("zod").ZodNumber;
                        active: import("zod").ZodNumber;
                        new: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        total: number;
                        active: number;
                        new: number;
                    }, {
                        total: number;
                        active: number;
                        new: number;
                    }>;
                }, "strip", import("zod").ZodTypeAny, {
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
                500: import("zod").ZodObject<{
                    success: import("zod").ZodBoolean;
                    data: import("zod").ZodOptional<import("zod").ZodUndefined>;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    message: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
};
export type ApiContract = typeof apiContract;
