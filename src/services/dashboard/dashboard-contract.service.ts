/**
 * Dashboard Service - Generated from Contract
 * This service implements EXACTLY what the contract specifies
 */

import { PrismaClient } from '@prisma/client';
import {
  ClientMetrics,
  RevenueMetrics,
  InvoiceStatistics,
  CashFlowProjections,
  SyncStatus,
  AccountStatus,
  QuickStats,
} from '../../../packages/contracts/src/schemas/dashboard';
import { z } from 'zod';

export class DashboardContractService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get client metrics - EXACTLY as contract specifies
   */
  async getClientMetrics(): Promise<z.infer<typeof ClientMetrics>> {
    // Get total clients
    const totalClients = await this.prisma.client.count();

    // Get active clients (with invoices in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeClients = await this.prisma.client.count({
      where: {
        invoices: {
          some: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
    });

    // Get new clients this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await this.prisma.client.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Get top clients by revenue
    const topClientsData = await this.prisma.client.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        invoices: {
          select: {
            total: true,
          },
        },
      },
      orderBy: {
        invoices: {
          _count: 'desc',
        },
      },
    });

    const topClients = topClientsData.map((client) => ({
      id: client.id,
      name: client.name,
      revenue: client.invoices.reduce((sum, inv) => sum + (inv.total?.toNumber() || 0), 0),
      invoiceCount: client.invoices.length,
    }));

    return {
      totalClients,
      activeClients,
      newThisMonth,
      topClients,
    };
  }

  /**
   * Get revenue metrics - EXACTLY as contract specifies
   */
  async getRevenueMetrics(): Promise<z.infer<typeof RevenueMetrics>> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Current month revenue
    const currentMonthRevenue = await this.prisma.invoice.aggregate({
      where: {
        createdAt: {
          gte: currentMonth,
        },
        status: 'paid',
      },
      _sum: {
        total: true,
      },
    });

    // Previous month revenue
    const previousMonthRevenue = await this.prisma.invoice.aggregate({
      where: {
        createdAt: {
          gte: previousMonth,
          lt: currentMonth,
        },
        status: 'paid',
      },
      _sum: {
        total: true,
      },
    });

    // Year to date revenue
    const yearToDateRevenue = await this.prisma.invoice.aggregate({
      where: {
        createdAt: {
          gte: startOfYear,
        },
        status: 'paid',
      },
      _sum: {
        total: true,
      },
    });

    const current = currentMonthRevenue._sum?.total?.toNumber() || 0;
    const previous = previousMonthRevenue._sum?.total?.toNumber() || 0;
    const ytd = yearToDateRevenue._sum?.total?.toNumber() || 0;

    const growthRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    // Get monthly data for the year
    const monthlyData = [];
    for (let month = 0; month <= now.getMonth(); month++) {
      const monthStart = new Date(now.getFullYear(), month, 1);
      const monthEnd = new Date(now.getFullYear(), month + 1, 1);

      const monthData = await this.prisma.invoice.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
          status: 'paid',
        },
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
      });

      monthlyData.push({
        month: monthStart.toLocaleDateString('es-ES', { month: 'short' }),
        revenue: monthData._sum?.total?.toNumber() || 0,
        invoices: monthData._count?.id || 0,
      });
    }

    return {
      currentMonth: current,
      previousMonth: previous,
      yearToDate: ytd,
      growthRate,
      monthlyData,
    };
  }

  /**
   * Get invoice statistics - EXACTLY as contract specifies
   */
  async getInvoiceStatistics(): Promise<z.infer<typeof InvoiceStatistics>> {
    const [total, pending, paid, overdue] = await Promise.all([
      // Total invoices
      this.prisma.invoice.aggregate({
        _count: { id: true },
        _sum: { total: true },
      }),

      // Pending invoices
      this.prisma.invoice.aggregate({
        where: { status: 'pending' },
        _count: { id: true },
        _sum: { total: true },
      }),

      // Paid invoices
      this.prisma.invoice.aggregate({
        where: { status: 'paid' },
        _count: { id: true },
        _sum: { total: true },
      }),

      // Overdue invoices
      this.prisma.invoice.aggregate({
        where: {
          status: 'pending',
          dueDate: {
            lt: new Date(),
          },
        },
        _count: { id: true },
        _sum: { total: true },
      }),
    ]);

    return {
      totalInvoices: total._count.id,
      pendingInvoices: pending._count.id,
      paidInvoices: paid._count.id,
      overdueInvoices: overdue._count.id,
      totalAmount: total._sum.total?.toNumber() || 0,
      pendingAmount: pending._sum.total?.toNumber() || 0,
      paidAmount: paid._sum.total?.toNumber() || 0,
      overdueAmount: overdue._sum.total?.toNumber() || 0,
    };
  }

  /**
   * Get cash flow projections - EXACTLY as contract specifies
   */
  async getCashFlowProjections(): Promise<z.infer<typeof CashFlowProjections>> {
    // Simple projection based on pending invoices
    const pendingInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'pending',
      },
      select: {
        total: true,
        dueDate: true,
      },
    });

    const projections = pendingInvoices.map((invoice) => ({
      month:
        invoice.dueDate?.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) || 'N/A',
      income: invoice.total?.toNumber() || 0,
      expenses: 0, // TODO: Add expense tracking
      balance: invoice.total?.toNumber() || 0,
    }));

    const totalIncome = projections.reduce((sum, p) => sum + p.income, 0);
    const totalExpenses = 0;

    return {
      projections,
      summary: {
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
      },
    };
  }

  /**
   * Get sync status - EXACTLY as contract specifies
   */
  async getSyncStatus(): Promise<z.infer<typeof SyncStatus>> {
    // TODO: Implement real scheduler status
    return {
      scheduler: {
        isActive: false,
        nextSync: '',
        lastSync: '',
      },
      stats: {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0,
      },
    };
  }

  /**
   * Get account status - EXACTLY as contract specifies
   */
  async getAccountStatus(): Promise<z.infer<typeof AccountStatus>> {
    // TODO: Implement real account data from GoCardless
    return {
      accounts: [],
      totalAccounts: 0,
      activeAccounts: 0,
    };
  }

  /**
   * Get quick stats - EXACTLY as contract specifies
   */
  async getQuickStats(): Promise<z.infer<typeof QuickStats>> {
    // Get revenue stats
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const previousMonth = new Date(currentMonth);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const [currentRevenue, previousRevenue] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          createdAt: { gte: currentMonth },
          status: 'paid',
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          createdAt: { gte: previousMonth, lt: currentMonth },
          status: 'paid',
        },
        _sum: { total: true },
      }),
    ]);

    const current = currentRevenue._sum.total?.toNumber() || 0;
    const previous = previousRevenue._sum.total?.toNumber() || 0;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    // Get invoice stats
    const [totalInvoices, pendingInvoices, overdueInvoices] = await Promise.all([
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { status: 'pending' } }),
      this.prisma.invoice.count({
        where: {
          status: 'pending',
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    // Get client stats
    const [totalClients, activeClients, newClients] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({
        where: {
          invoices: {
            some: {
              createdAt: { gte: currentMonth },
            },
          },
        },
      }),
      this.prisma.client.count({
        where: {
          createdAt: { gte: currentMonth },
        },
      }),
    ]);

    return {
      revenue: {
        current,
        previous,
        change,
      },
      invoices: {
        total: totalInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices,
      },
      clients: {
        total: totalClients,
        active: activeClients,
        new: newClients,
      },
    };
  }
}
