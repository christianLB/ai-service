import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { financialRouter } from '../../src/routes/financial';
import { GoCardlessService } from '../../src/services/financial/gocardless.service';
import { SchedulerService } from '../../src/services/financial/scheduler.service';

// Mock services
jest.mock('../../src/services/financial/gocardless.service');
jest.mock('../../src/services/financial/scheduler.service');
jest.mock('../../src/services/financial/database.service');

describe('Financial Routes', () => {
  let app: express.Application;
  let mockGoCardlessService: jest.Mocked<GoCardlessService>;
  let mockSchedulerService: jest.Mocked<SchedulerService>;
  let authToken: string;

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, 'test-secret');
          (req as any).user = decoded;
        } catch (error) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
      next();
    });

    // Mount financial router
    app.use('/api/financial', financialRouter);

    // Create valid auth token
    authToken = jwt.sign(
      { userId: 'test-user-id', email: 'test@example.com', role: 'admin' },
      'test-secret',
      { expiresIn: '1h' }
    );

    // Setup mocks
    mockGoCardlessService = GoCardlessService.prototype as jest.Mocked<GoCardlessService>;
    mockSchedulerService = SchedulerService.prototype as jest.Mocked<SchedulerService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/financial/sync', () => {
    it('should successfully sync accounts and transactions', async () => {
      // Arrange
      const mockSyncResult = {
        accountsSynced: 2,
        transactionsSynced: 45,
        balancesSynced: 2,
        errors: []
      };

      mockGoCardlessService.syncAllAccounts = jest.fn().mockResolvedValue(mockSyncResult);

      // Act
      const response = await request(app)
        .post('/api/financial/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockSyncResult,
        message: expect.stringContaining('Manual sync completed')
      });
      expect(mockGoCardlessService.syncAllAccounts).toHaveBeenCalled();
    });

    it('should handle rate limit errors gracefully', async () => {
      // Arrange
      const mockSyncResult = {
        accountsSynced: 1,
        transactionsSynced: 0,
        balancesSynced: 1,
        errors: [
          'Account 123 transactions: GoCardless rate limit exceeded. Next sync available in 23 hours.'
        ]
      };

      mockGoCardlessService.syncAllAccounts = jest.fn().mockResolvedValue(mockSyncResult);

      // Act
      const response = await request(app)
        .post('/api/financial/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      // Assert
      expect(response.status).toBe(200); // Still returns 200 with partial success
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0]).toContain('rate limit exceeded');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/financial/sync')
        .send();

      // Assert
      expect(response.status).toBe(401);
      expect(mockGoCardlessService.syncAllAccounts).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      mockGoCardlessService.syncAllAccounts = jest.fn()
        .mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .post('/api/financial/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('sync failed')
      });
    });
  });

  describe('GET /api/financial/sync-status', () => {
    it('should return sync status information', async () => {
      // Arrange
      const mockStatus = {
        scheduler: {
          isRunning: true,
          activeIntervals: 1,
          nextSyncEstimate: '2025-01-27T20:00:00.000Z',
          startedAt: '2025-01-26T08:00:00.000Z'
        },
        stats: {
          summary: {
            total_syncs: '10',
            successful_syncs: '8',
            failed_syncs: '2',
            total_accounts_synced: '2',
            total_transactions_synced: '150',
            last_sync: '2025-01-26T12:00:00.000Z'
          },
          recentSyncs: []
        }
      };

      mockSchedulerService.getStatus = jest.fn().mockReturnValue({
        isRunning: true,
        activeIntervals: 1,
        nextSyncEstimate: '2025-01-27T20:00:00.000Z',
        startedAt: '2025-01-26T08:00:00.000Z'
      });

      // Mock database query for stats
      const mockDb = {
        query: jest.fn().mockResolvedValue({
          rows: [{
            total_syncs: '10',
            successful_syncs: '8',
            failed_syncs: '2',
            total_accounts_synced: '2',
            total_transactions_synced: '150',
            last_sync: '2025-01-26T12:00:00.000Z'
          }]
        })
      };
      (mockSchedulerService as any).db = mockDb;

      // Act
      const response = await request(app)
        .get('/api/financial/sync-status')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('scheduler');
      expect(response.body.data).toHaveProperty('stats');
    });
  });

  describe('GET /api/financial/transactions', () => {
    it('should return paginated transactions', async () => {
      // Arrange
      const mockTransactions = {
        items: [
          {
            id: 'trans-1',
            amount: '100.00',
            description: 'Test payment',
            date: '2025-01-26'
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false
      };

      const mockDb = {
        getTransactions: jest.fn().mockResolvedValue(mockTransactions)
      };
      (mockGoCardlessService as any).db = mockDb;

      // Act
      const response = await request(app)
        .get('/api/financial/transactions')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject(mockTransactions);
      expect(mockDb.getTransactions).toHaveBeenCalledWith(undefined, 1, 10);
    });

    it('should filter transactions by account', async () => {
      // Arrange
      const mockDb = {
        getTransactions: jest.fn().mockResolvedValue({
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          hasNext: false,
          hasPrev: false
        })
      };
      (mockGoCardlessService as any).db = mockDb;

      // Act
      const response = await request(app)
        .get('/api/financial/transactions')
        .query({ accountId: 'test-account-123' })
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(mockDb.getTransactions).toHaveBeenCalledWith('test-account-123', 1, 50);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests', async () => {
      // Act
      const response = await request(app)
        .post('/api/financial/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      // Assert
      expect(response.status).toBe(400);
    });

    it('should handle missing endpoints with 404', async () => {
      // Act
      const response = await request(app)
        .get('/api/financial/non-existent-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });
});