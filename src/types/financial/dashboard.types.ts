export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface InvoiceStats {
  total: number;
  totalAmount: number;
  averageAmount: number;
  paid: number;
  paidAmount: number;
  pending: number;
  pendingAmount: number;
  overdue: number;
  overdueAmount: number;
}

export interface ClientMetrics {
  total: number;
  active: number;
  new: number;
  churned: number;
  averageRevenue: number;
}

export interface RevenueMetric {
  month: Date;
  amount: number;
  uniqueClients: number;
  invoiceCount: number;
  monthOverMonthGrowth: number;
  yearOverYearGrowth: number;
}

export interface CategoryBreakdown {
  category: string;
  color: string;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  percentage: number;
}

export interface TopClient {
  id: string;
  name: string;
  email: string;
  invoiceCount: number;
  totalRevenue: number;
  revenueRank: number;
  customerLifetimeDays: number;
  monthlyAverageRevenue: number;
}

export interface DashboardMetrics {
  revenue?: {
    total: number;
    changePercentage?: number;
  };
  invoices?: {
    total: number;
    pending: number;
    overdue: number;
  };
  clients?: {
    total: number;
    active: number;
    new: number;
  };
  invoiceStats: InvoiceStats;
  clientMetrics: ClientMetrics;
  revenueMetrics: RevenueMetric[];
  categoryBreakdown: CategoryBreakdown[];
  topClients: TopClient[];
  lastUpdated: Date;
}

export interface DashboardFilters {
  timeRange: TimeRange;
  currency?: string;
  clientId?: string;
  categoryId?: string;
}

export interface DashboardQueryOptions {
  enableValidation?: boolean;
  fallbackToSql?: boolean;
  measurePerformance?: boolean;
}