import api from './api';
import type { DashboardMetrics, HealthStatus, ApiResponse } from '../types';

class DashboardService {
  async getDashboardOverview(currency = 'EUR'): Promise<ApiResponse<DashboardMetrics>> {
    const response = await api.get('/financial/dashboard/overview', {
      params: { currency }
    });
    return response.data;
  }

  async getQuickStats(params?: {
    currency?: string;
    period?: string;
  }): Promise<ApiResponse<{
    current: {
      income: string;
      expenses: string;
      net: string;
      transactions: number;
    };
    previous: {
      income: string;
      expenses: string;
      net: string;
      transactions: number;
    };
    changes: {
      income: number;
      expenses: number;
      net: number;
    };
    period: {
      current: { start: string; end: string };
      previous: { start: string; end: string };
    };
    currency: string;
    generatedAt: string;
  }>> {
    const response = await api.get('/financial/dashboard/quick-stats', { params });
    return response.data;
  }

  async getHealthCheck(): Promise<HealthStatus> {
    const response = await api.get('/financial/health');
    return response.data;
  }

  async getAccountStatus(): Promise<ApiResponse<any>> {
    const response = await api.get('/financial/account-status');
    return response.data;
  }

  async getSyncStatus(): Promise<ApiResponse<{
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
  }>> {
    const response = await api.get('/financial/sync-status');
    return response.data;
  }

  async performManualSync(): Promise<ApiResponse<any>> {
    const response = await api.post('/financial/sync');
    return response.data;
  }

  async startScheduler(): Promise<ApiResponse<any>> {
    const response = await api.post('/financial/scheduler/start');
    return response.data;
  }

  async stopScheduler(): Promise<ApiResponse<any>> {
    const response = await api.post('/financial/scheduler/stop');
    return response.data;
  }

  async getRealtimeMetrics(params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    currency?: string;
    includeProjections?: boolean;
    includeTrends?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await api.get('/financial/metrics/realtime', { params });
    return response.data;
  }

  async getMonthlyAnalytics(params: {
    startDate: string;
    endDate: string;
    currency?: string;
  }): Promise<ApiResponse<any[]>> {
    const response = await api.get('/financial/analytics/monthly-summary', { params });
    return response.data;
  }

  async getAccountInsights(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/financial/insights/accounts');
    return response.data;
  }

  async getCategories(type?: 'income' | 'expense' | 'transfer'): Promise<ApiResponse<any[]>> {
    const response = await api.get('/financial/categories', {
      params: { type }
    });
    return response.data;
  }

  async autoCategorizeTransactions(transactionIds?: string[]): Promise<ApiResponse<{
    categorizedCount: number;
    message: string;
  }>> {
    const response = await api.post('/financial/categorize/auto', { transactionIds });
    return response.data;
  }

  // ============================================================================
  // ENHANCED DASHBOARD ENDPOINTS
  // ============================================================================

  async getRevenueMetrics(params?: {
    period?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
    currency?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{
    period: {
      type: string;
      current: { start: string; end: string };
      previous: { start: string; end: string };
    };
    currentPeriod: {
      totalRevenue: string;
      paidRevenue: string;
      pendingRevenue: string;
      overdueRevenue: string;
      totalInvoices: number;
      paidInvoices: number;
      averageInvoiceAmount: string;
      uniqueClients: number;
    };
    previousPeriod: {
      totalRevenue: string;
      paidRevenue: string;
      pendingRevenue: string;
      overdueRevenue: string;
      totalInvoices: number;
      paidInvoices: number;
      averageInvoiceAmount: string;
      uniqueClients: number;
    };
    growth: {
      revenueGrowth: number;
      invoiceGrowth: number;
    };
    trends: {
      monthlyRevenue: Array<{
        month: string;
        revenue: string;
        invoices: number;
      }>;
    };
    topClients: Array<{
      id: string;
      name: string;
      businessName: string;
      totalRevenue: string;
      totalInvoices: number;
      avgInvoiceAmount: string;
    }>;
    currency: string;
    generatedAt: string;
  }>> {
    const response = await api.get('/financial/dashboard/revenue-metrics', { params });
    return response.data;
  }

  async getInvoiceStats(params?: {
    currency?: string;
    includeAging?: boolean;
  }): Promise<ApiResponse<{
    overview: {
      totalInvoices: number;
      draftInvoices: number;
      sentInvoices: number;
      viewedInvoices: number;
      paidInvoices: number;
      overdueInvoices: number;
      cancelledInvoices: number;
      totalAmount: string;
      paidAmount: string;
      pendingAmount: string;
      overdueAmount: string;
      averageInvoiceAmount: string;
      averagePaymentDays: string;
    };
    paymentBehavior: Array<{
      category: string;
      count: number;
      amount: string;
    }>;
    agingAnalysis: Array<{
      bucket: string;
      count: number;
      amount: string;
    }> | null;
    trends: {
      monthlyCreation: Array<{
        month: string;
        invoicesCreated: number;
        totalAmount: string;
      }>;
    };
    topOverdueInvoices: Array<{
      id: string;
      invoiceNumber: string;
      clientName: string;
      total: string;
      dueDate: string;
      daysOverdue: number;
    }>;
    currency: string;
    generatedAt: string;
  }>> {
    const response = await api.get('/financial/dashboard/invoice-stats', { params });
    return response.data;
  }

  async getClientMetrics(params?: {
    currency?: string;
    limit?: number;
    sortBy?: 'total_revenue' | 'outstanding_balance' | 'risk_score' | 'last_invoice_date';
    includeInactive?: boolean;
  }): Promise<ApiResponse<{
    summary: {
      totalClients: number;
      activeClients: number;
      inactiveClients: number;
      suspendedClients: number;
      prospectClients: number;
      avgClientRevenue: string;
      avgOutstandingBalance: string;
      totalClientRevenue: string;
      totalOutstandingBalance: string;
    };
    clients: Array<{
      id: string;
      name: string;
      businessName: string;
      email: string;
      status: string;
      totalRevenue: string;
      totalInvoices: number;
      outstandingBalance: string;
      lastInvoiceDate: string;
      averageInvoiceAmount: string;
      paymentTerms: number;
      paidInvoices: number;
      pendingInvoices: number;
      overdueInvoices: number;
      averagePaymentDays: string;
      lastPaymentDate: string;
      riskScore: string;
    }>;
    riskDistribution: Array<{
      riskScore: string;
      count: number;
      totalRevenue: string;
      totalOutstanding: string;
    }>;
    paymentBehavior: Array<{
      category: string;
      clientCount: number;
      avgRevenue: string;
    }>;
    topRevenueClients: Array<{
      id: string;
      name: string;
      businessName: string;
      totalRevenue: string;
      totalInvoices: number;
      status: string;
      revenuePercentage: string;
    }>;
    currency: string;
    generatedAt: string;
  }>> {
    const response = await api.get('/financial/dashboard/client-metrics', { params });
    return response.data;
  }

  async getCashFlowProjections(params?: {
    currency?: string;
    daysAhead?: number;
    includeTransactions?: boolean;
  }): Promise<ApiResponse<{
    currentPosition: {
      currentCashBalance: string;
      totalOutstanding: string;
      expectedCollections: string;
      collectionRate: string;
    };
    projectionPeriod: {
      daysAhead: number;
      startDate: string;
      endDate: string;
    };
    weeklyProjections: Array<{
      weekStart: string;
      weekEnd: string;
      expectedReceipts: string;
      projectedBalance: string;
      invoicesCount: number;
    }>;
    outstandingInvoices: Array<{
      id: string;
      invoiceNumber: string;
      clientName: string;
      total: string;
      dueDate: string;
      status: string;
      estimatedPaymentDate: string;
      paymentProbability: string;
      riskScore: string;
    }>;
    riskAnalysis: {
      highRisk: { count: number; amount: string };
      mediumRisk: { count: number; amount: string };
      lowRisk: { count: number; amount: string };
    };
    recentTransactions: Array<{
      amount: string;
      date: string;
      description: string;
      counterpartyName: string;
      type: string;
    }>;
    currency: string;
    generatedAt: string;
  }>> {
    const response = await api.get('/financial/dashboard/cash-flow', { params });
    return response.data;
  }

  async getDashboardHealth(): Promise<ApiResponse<{
    status: string;
    services: {
      database: string;
      endpoints: string[];
    };
    timestamp: string;
  }>> {
    const response = await api.get('/financial/dashboard/health');
    return response.data;
  }

  async getYearlyReport(params: {
    year: number;
    currency?: string;
  }): Promise<ApiResponse<{
    year: number;
    currency: string;
    categories: {
      income: Array<{
        categoryId: string;
        categoryName: string;
        categoryColor: string;
        monthlyData: Record<string, string>;
        total: string;
        percentage: number;
      }>;
      expense: Array<{
        categoryId: string;
        categoryName: string;
        categoryColor: string;
        monthlyData: Record<string, string>;
        total: string;
        percentage: number;
      }>;
    };
    monthlyTotals: {
      income: Record<string, string>;
      expense: Record<string, string>;
      balance: Record<string, string>;
    };
    yearTotals: {
      income: string;
      expense: string;
      balance: string;
    };
  }>> {
    const response = await api.get('/financial/dashboard/yearly-report', { params });
    return response.data;
  }
}

export default new DashboardService();