import { PrismaClient } from '@prisma/client';
import { FinancialDashboardService } from '../financial-dashboard.service';
import { TimeRange } from '../../../types/financial/dashboard.types';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    invoice: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn()
    },
    client: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    transaction: {
      findMany: jest.fn(),
      aggregate: jest.fn()
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn()
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

describe('FinancialDashboardService', () => {
  let service: FinancialDashboardService;
  let prisma: any;
  
  const mockTimeRange: TimeRange = {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
    service = new FinancialDashboardService(prisma);
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe('getBasicInvoiceStats', () => {
    it('should return correct invoice statistics', async () => {
      // Mock aggregation results
      prisma.invoice.aggregate
        .mockResolvedValueOnce({
          _count: { id: 100 },
          _sum: { totalAmount: 50000 },
          _avg: { totalAmount: 500 }
        })
        .mockResolvedValueOnce({
          _count: { id: 80 },
          _sum: { totalAmount: 40000 }
        })
        .mockResolvedValueOnce({
          _count: { id: 5 },
          _sum: { totalAmount: 2500 }
        });

      const result = await service.getBasicInvoiceStats(mockTimeRange);

      expect(result).toEqual({
        total: 100,
        totalAmount: 50000,
        averageAmount: 500,
        paid: 80,
        paidAmount: 40000,
        overdue: 5,
        overdueAmount: 2500,
        pending: 0,
        pendingAmount: 0
      });

      expect(prisma.invoice.aggregate).toHaveBeenCalledTimes(3);
    });

    it('should handle null aggregation results', async () => {
      prisma.invoice.aggregate.mockResolvedValue({
        _count: { id: null },
        _sum: { totalAmount: null },
        _avg: { totalAmount: null }
      });

      const result = await service.getBasicInvoiceStats(mockTimeRange);

      expect(result.total).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.averageAmount).toBe(0);
    });
  });

  describe('getBasicClientMetrics', () => {
    it('should return correct client metrics', async () => {
      prisma.client.count
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(120) // active
        .mockResolvedValueOnce(15); // new

      const result = await service.getBasicClientMetrics();

      expect(result).toEqual({
        total: 150,
        active: 120,
        new: 15,
        churned: 0,
        averageRevenue: 0
      });

      expect(prisma.client.count).toHaveBeenCalledTimes(3);
    });
  });

  describe('getRevenueMetrics', () => {
    it('should return revenue metrics with growth calculations', async () => {
      const mockRevenueData = [
        {
          month: new Date('2025-01-01'),
          amount: 10000,
          uniqueClients: 25,
          invoiceCount: 30,
          monthOverMonthGrowth: 10.5,
          yearOverYearGrowth: 25.0
        }
      ];

      prisma.$queryRaw.mockResolvedValue(mockRevenueData);

      const result = await service.getRevenueMetrics(mockTimeRange, 'EUR');

      expect(result).toEqual(mockRevenueData);
      expect(prisma.$queryRaw).toHaveBeenCalledWith(
        expect.any(Array),
        mockTimeRange.startDate,
        mockTimeRange.endDate,
        'EUR'
      );
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should return category breakdown with percentages', async () => {
      const mockCategoryData = [
        {
          category: 'Software',
          color: '#4CAF50',
          transactionCount: 50,
          totalAmount: 5000,
          averageAmount: 100,
          percentage: 45.5
        },
        {
          category: 'Hardware',
          color: '#2196F3',
          transactionCount: 30,
          totalAmount: 3000,
          averageAmount: 100,
          percentage: 27.3
        }
      ];

      prisma.$queryRaw.mockResolvedValue(mockCategoryData);

      const result = await service.getCategoryBreakdown(mockTimeRange);

      expect(result).toEqual(mockCategoryData);
      expect(result[0].percentage).toBe(45.5);
    });
  });

  describe('getTopClients', () => {
    it('should return top clients with calculated metrics', async () => {
      const mockTopClients = [
        {
          id: 'client-1',
          name: 'Acme Corp',
          email: 'acme@example.com',
          invoiceCount: 50,
          totalRevenue: 100000,
          revenueRank: 1,
          customerLifetimeDays: 365,
          monthlyAverageRevenue: 8219.18
        }
      ];

      prisma.$queryRaw.mockResolvedValue(mockTopClients);

      const result = await service.getTopClients(10);

      expect(result).toEqual(mockTopClients);
      expect(result[0].monthlyAverageRevenue).toBeCloseTo(8219.18, 2);
    });
  });

  describe('measureQueryPerformance', () => {
    it('should measure and log query performance', async () => {
      const mockResult = { data: 'test' };
      const queryFn = jest.fn().mockResolvedValue(mockResult);

      const { result, duration } = await service.measureQueryPerformance(
        'test-query',
        queryFn
      );

      expect(result).toEqual(mockResult);
      expect(duration).toBeGreaterThan(0);
      expect(queryFn).toHaveBeenCalled();
    });

    it('should handle query failures', async () => {
      const error = new Error('Query failed');
      const queryFn = jest.fn().mockRejectedValue(error);

      await expect(
        service.measureQueryPerformance('test-query', queryFn)
      ).rejects.toThrow('Query failed');
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return complete dashboard metrics', async () => {
      // Mock all sub-methods
      jest.spyOn(service, 'getBasicInvoiceStats').mockResolvedValue({
        total: 100,
        totalAmount: 50000,
        averageAmount: 500,
        paid: 80,
        paidAmount: 40000,
        pending: 0,
        pendingAmount: 0,
        overdue: 5,
        overdueAmount: 2500
      });

      jest.spyOn(service, 'getBasicClientMetrics').mockResolvedValue({
        total: 150,
        active: 120,
        new: 15,
        churned: 0,
        averageRevenue: 0
      });

      jest.spyOn(service, 'getRevenueMetrics').mockResolvedValue([]);
      jest.spyOn(service, 'getCategoryBreakdown').mockResolvedValue([]);
      jest.spyOn(service, 'getTopClients').mockResolvedValue([]);

      prisma.invoice.aggregate.mockResolvedValue({
        _count: { id: 15 },
        _sum: { totalAmount: 7500 }
      });

      const result = await service.getDashboardMetrics(mockTimeRange, 'EUR');

      expect(result).toHaveProperty('invoiceStats');
      expect(result).toHaveProperty('clientMetrics');
      expect(result).toHaveProperty('revenueMetrics');
      expect(result).toHaveProperty('categoryBreakdown');
      expect(result).toHaveProperty('topClients');
      expect(result).toHaveProperty('lastUpdated');
      expect(result.invoiceStats.pending).toBe(15);
      expect(result.invoiceStats.pendingAmount).toBe(7500);
    });
  });

  describe('Data Validation', () => {
    it('should validate matching results between SQL and Prisma', async () => {
      const operation = 'test-operation';
      const matchingData = { value: 100, status: 'success' };

      // Test with validation enabled
      process.env.ENABLE_SQL_VALIDATION = 'true';
      const validationService = new FinancialDashboardService(prisma);

      const isValid = await validationService['validateResults'](
        operation,
        matchingData,
        matchingData
      );

      expect(isValid).toBe(true);
    });

    it('should detect differences in validation', async () => {
      const operation = 'test-operation';
      const prismaData = { value: 100, status: 'success' };
      const sqlData = { value: 101, status: 'success' };

      process.env.ENABLE_SQL_VALIDATION = 'true';
      process.env.NODE_ENV = 'test';
      
      const validationService = new FinancialDashboardService(prisma);

      await expect(
        validationService['validateResults'](operation, prismaData, sqlData)
      ).rejects.toThrow('Data validation failed');
    });

    it('should find specific differences between objects', () => {
      const obj1 = {
        name: 'John',
        age: 30,
        address: { city: 'NYC', zip: '10001' },
        hobbies: ['reading', 'gaming']
      };

      const obj2 = {
        name: 'John',
        age: 31,
        address: { city: 'NYC', zip: '10002' },
        hobbies: ['reading']
      };

      const differences = service['findDifferences'](obj1, obj2);

      expect(differences).toContain('Value mismatch at .age: 30 vs 31');
      expect(differences).toContain('Value mismatch at .address.zip: 10001 vs 10002');
      expect(differences).toContain('Array length mismatch at .hobbies: 2 vs 1');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      prisma.invoice.aggregate.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getBasicInvoiceStats(mockTimeRange))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle raw query errors', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('SQL syntax error'));

      await expect(service.getRevenueMetrics(mockTimeRange))
        .rejects.toThrow('SQL syntax error');
    });
  });
});