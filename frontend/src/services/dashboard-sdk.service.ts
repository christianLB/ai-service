/**
 * Dashboard Service - SDK Version
 *
 * This service uses the SDK client with openapi-fetch for type-safe API calls.
 * It replaces the axios-based dashboardService.ts.
 */

import { financialApi } from '../lib/api-client';

// Types are inferred from the SDK client responses

class DashboardSDKService {
  async getDashboardOverview(currency = 'EUR') {
    const { data, error } = await financialApi.GET('/dashboard/overview', {
      params: {
        query: { currency },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch dashboard overview');
    }

    return data;
  }

  async getQuickStats(params?: { currency?: string; period?: string }) {
    const { data, error } = await financialApi.GET('/dashboard/quick-stats', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch quick stats');
    }

    return data;
  }

  async getHealthCheck() {
    const { data, error } = await financialApi.GET('/health', {});

    if (error) {
      throw new Error(error.message || 'Failed to fetch health status');
    }

    return data;
  }

  async getAccountStatus() {
    const { data, error } = await financialApi.GET('/account-status', {});

    if (error) {
      throw new Error(error.message || 'Failed to fetch account status');
    }

    return data;
  }

  async getSyncStatus() {
    const { data, error } = await financialApi.GET('/sync-status', {});

    if (error) {
      throw new Error(error.message || 'Failed to fetch sync status');
    }

    return data;
  }

  async performManualSync() {
    const { data, error } = await financialApi.POST('/sync', {});

    if (error) {
      throw new Error(error.message || 'Failed to perform manual sync');
    }

    return data;
  }

  async startScheduler() {
    const { data, error } = await financialApi.POST('/scheduler/start', {});

    if (error) {
      throw new Error(error.message || 'Failed to start scheduler');
    }

    return data;
  }

  async stopScheduler() {
    const { data, error } = await financialApi.POST('/scheduler/stop', {});

    if (error) {
      throw new Error(error.message || 'Failed to stop scheduler');
    }

    return data;
  }

  async getRealtimeMetrics(params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    currency?: string;
    includeProjections?: boolean;
    includeTrends?: boolean;
  }) {
    const { data, error } = await financialApi.GET('/metrics/realtime', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch realtime metrics');
    }

    return data;
  }

  async getMonthlyAnalytics(params: { startDate: string; endDate: string; currency?: string }) {
    const { data, error } = await financialApi.GET('/analytics/monthly-summary', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch monthly analytics');
    }

    return data;
  }

  async getAccountInsights() {
    const { data, error } = await financialApi.GET('/insights/accounts', {});

    if (error) {
      throw new Error(error.message || 'Failed to fetch account insights');
    }

    return data;
  }

  async getCategories(type?: 'income' | 'expense' | 'transfer') {
    const { data, error } = await financialApi.GET('/categories', {
      params: {
        query: { type },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch categories');
    }

    return data;
  }

  async autoCategorizeTransactions(transactionIds?: string[]) {
    const { data, error } = await financialApi.POST('/categorize/auto', {
      body: { transactionIds },
    });

    if (error) {
      throw new Error(error.message || 'Failed to auto-categorize transactions');
    }

    return data;
  }

  // ============================================================================
  // ENHANCED DASHBOARD ENDPOINTS
  // ============================================================================

  async getRevenueMetrics(params?: {
    period?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
    currency?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { data, error } = await financialApi.GET('/dashboard/revenue-metrics', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch revenue metrics');
    }

    return data;
  }

  async getInvoiceStats(params?: { currency?: string; includeAging?: boolean }) {
    const { data, error } = await financialApi.GET('/dashboard/invoice-stats', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch invoice stats');
    }

    return data;
  }

  async getClientMetrics(params?: {
    currency?: string;
    limit?: number;
    sortBy?: 'total_revenue' | 'outstanding_balance' | 'risk_score' | 'last_invoice_date';
    includeInactive?: boolean;
  }) {
    const { data, error } = await financialApi.GET('/dashboard/client-metrics', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch client metrics');
    }

    return data;
  }

  async getCashFlowProjections(params?: {
    currency?: string;
    daysAhead?: number;
    includeTransactions?: boolean;
  }) {
    const { data, error } = await financialApi.GET('/dashboard/cash-flow', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch cash flow projections');
    }

    return data;
  }

  async getDashboardHealth() {
    const { data, error } = await financialApi.GET('/dashboard/health', {});

    if (error) {
      throw new Error(error.message || 'Failed to fetch dashboard health');
    }

    return data;
  }

  async getYearlyReport(params: { year: number; currency?: string }) {
    const { data, error } = await financialApi.GET('/dashboard/yearly-report', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch yearly report');
    }

    return data;
  }
}

export default new DashboardSDKService();
