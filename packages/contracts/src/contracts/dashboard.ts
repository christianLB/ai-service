import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  HealthStatus,
  ClientMetrics,
  RevenueMetrics,
  InvoiceStatistics,
  CashFlowProjections,
  SyncStatus,
  AccountStatus,
  QuickStats,
  ApiResponse,
} from '../schemas/dashboard';

const c = initContract();

export const dashboardContract = c.router({
  // Health check
  health: {
    method: 'GET',
    path: '/api/financial/health',
    responses: { 
      200: HealthStatus,
      500: ApiResponse(z.undefined()),
    },
    summary: 'Check health status of financial services',
  },

  // Client metrics
  clientMetrics: {
    method: 'GET',
    path: '/api/dashboard/client-metrics',
    responses: { 
      200: ClientMetrics,
      500: ApiResponse(z.undefined()),
    },
    summary: 'Get client metrics and statistics',
  },

  // Revenue metrics
  revenueMetrics: {
    method: 'GET',
    path: '/api/dashboard/revenue-metrics',
    query: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
    responses: { 
      200: RevenueMetrics,
      500: ApiResponse(z.undefined()),
    },
    summary: 'Get revenue metrics and trends',
  },

  // Invoice statistics
  invoiceStatistics: {
    method: 'GET',
    path: '/api/dashboard/invoice-statistics',
    responses: { 
      200: InvoiceStatistics,
      500: ApiResponse(z.undefined()),
    },
    summary: 'Get invoice statistics',
  },

  // Cash flow projections
  cashFlowProjections: {
    method: 'GET',
    path: '/api/dashboard/cash-flow-projections',
    query: z.object({
      months: z.number().min(1).max(12).optional(),
    }),
    responses: { 
      200: CashFlowProjections,
      500: ApiResponse(z.undefined()),
    },
    summary: 'Get cash flow projections',
  },

  // Sync status
  syncStatus: {
    method: 'GET',
    path: '/api/dashboard/sync-status',
    responses: { 
      200: SyncStatus,
      500: ApiResponse(z.undefined()),
    },
    summary: 'Get synchronization status',
  },

  // Account status
  accountStatus: {
    method: 'GET',
    path: '/api/dashboard/account-status',
    responses: { 
      200: AccountStatus,
      500: ApiResponse(z.undefined()),
    },
    summary: 'Get bank account status',
  },

  // Quick stats
  quickStats: {
    method: 'GET',
    path: '/api/dashboard/quick-stats',
    responses: { 
      200: QuickStats,
      500: ApiResponse(z.undefined()),
    },
    summary: 'Get quick statistics overview',
  },
});