"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardContract = void 0;
const core_1 = require("@ts-rest/core");
const zod_1 = require("zod");
const dashboard_1 = require("../schemas/dashboard");
const c = (0, core_1.initContract)();
exports.dashboardContract = c.router({
    // Health check
    health: {
        method: 'GET',
        path: '/api/financial/health',
        responses: {
            200: dashboard_1.HealthStatus,
            500: (0, dashboard_1.ApiResponse)(zod_1.z.undefined()),
        },
        summary: 'Check health status of financial services',
    },
    // Client metrics
    clientMetrics: {
        method: 'GET',
        path: '/api/dashboard/client-metrics',
        responses: {
            200: dashboard_1.ClientMetrics,
            500: (0, dashboard_1.ApiResponse)(zod_1.z.undefined()),
        },
        summary: 'Get client metrics and statistics',
    },
    // Revenue metrics
    revenueMetrics: {
        method: 'GET',
        path: '/api/dashboard/revenue-metrics',
        query: zod_1.z.object({
            startDate: zod_1.z.string().optional(),
            endDate: zod_1.z.string().optional(),
        }),
        responses: {
            200: dashboard_1.RevenueMetrics,
            500: (0, dashboard_1.ApiResponse)(zod_1.z.undefined()),
        },
        summary: 'Get revenue metrics and trends',
    },
    // Invoice statistics
    invoiceStatistics: {
        method: 'GET',
        path: '/api/dashboard/invoice-statistics',
        responses: {
            200: dashboard_1.InvoiceStatistics,
            500: (0, dashboard_1.ApiResponse)(zod_1.z.undefined()),
        },
        summary: 'Get invoice statistics',
    },
    // Cash flow projections
    cashFlowProjections: {
        method: 'GET',
        path: '/api/dashboard/cash-flow-projections',
        query: zod_1.z.object({
            months: zod_1.z.number().min(1).max(12).optional(),
        }),
        responses: {
            200: dashboard_1.CashFlowProjections,
            500: (0, dashboard_1.ApiResponse)(zod_1.z.undefined()),
        },
        summary: 'Get cash flow projections',
    },
    // Sync status
    syncStatus: {
        method: 'GET',
        path: '/api/dashboard/sync-status',
        responses: {
            200: dashboard_1.SyncStatus,
            500: (0, dashboard_1.ApiResponse)(zod_1.z.undefined()),
        },
        summary: 'Get synchronization status',
    },
    // Account status
    accountStatus: {
        method: 'GET',
        path: '/api/dashboard/account-status',
        responses: {
            200: dashboard_1.AccountStatus,
            500: (0, dashboard_1.ApiResponse)(zod_1.z.undefined()),
        },
        summary: 'Get bank account status',
    },
    // Quick stats
    quickStats: {
        method: 'GET',
        path: '/api/dashboard/quick-stats',
        responses: {
            200: dashboard_1.QuickStats,
            500: (0, dashboard_1.ApiResponse)(zod_1.z.undefined()),
        },
        summary: 'Get quick statistics overview',
    },
});
