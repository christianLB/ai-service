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
}

export default new DashboardService();