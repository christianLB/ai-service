import request from 'supertest';
import express from 'express';
import financialRoutes from '../financial';
import { transactionImportService } from '../../services/financial/transaction-import.service';

// Mock the transaction import service
jest.mock('../../services/financial/transaction-import.service', () => ({
  transactionImportService: {
    validateTransactions: jest.fn(),
    importTransactions: jest.fn(),
    getUserAccounts: jest.fn(),
  },
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, _next: any) => {
    req.user = { userId: 'test-user' };
    next();
  },
}));

describe('Financial Import Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/financial', financialRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/financial/transactions/import', () => {
    const mockImportResult = {
      imported: 10,
      skipped: 2,
      errors: [],
      duplicates: [],
    };

    it('should successfully import transactions from JSON file', async () => {
      (transactionImportService.validateTransactions as jest.Mock).mockReturnValue([]);
      (transactionImportService.importTransactions as jest.Mock).mockResolvedValue(mockImportResult);

      const mockFile = {
        transactions: [
          {
            amount: '-100.00',
            date: '2024-01-15T00:00:00Z',
            description: 'Test transaction',
          },
        ],
      };

      const response = await request(app)
        .post('/api/financial/transactions/import')
        .set('Authorization', 'Bearer test-token')
        .field('accountId', '44eef950-e08e-45b8-8315-6bfd41f4c10d')
        .attach('file', Buffer.from(JSON.stringify(mockFile)), 'transactions.json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(10);
      expect(response.body.message).toContain('Successfully imported 10 transactions');
    });

    it('should return 400 if no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/financial/transactions/import')
        .set('Authorization', 'Bearer test-token')
        .field('accountId', '44eef950-e08e-45b8-8315-6bfd41f4c10d');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 400 if accountId is missing', async () => {
      const mockFile = { transactions: [] };

      const response = await request(app)
        .post('/api/financial/transactions/import')
        .set('Authorization', 'Bearer test-token')
        .attach('file', Buffer.from(JSON.stringify(mockFile)), 'transactions.json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Account ID is required');
    });

    it('should return 400 if JSON is invalid', async () => {
      const response = await request(app)
        .post('/api/financial/transactions/import')
        .set('Authorization', 'Bearer test-token')
        .field('accountId', '44eef950-e08e-45b8-8315-6bfd41f4c10d')
        .attach('file', Buffer.from('invalid json'), 'transactions.json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid JSON file');
    });

    it('should return 400 if validation fails', async () => {
      const validationErrors = [
        { row: 1, error: 'Amount is required' },
        { row: 2, error: 'Invalid date format' },
      ];

      (transactionImportService.validateTransactions as jest.Mock).mockReturnValue(validationErrors);

      const mockFile = {
        transactions: [
          { description: 'Invalid transaction' },
        ],
      };

      const response = await request(app)
        .post('/api/financial/transactions/import')
        .set('Authorization', 'Bearer test-token')
        .field('accountId', '44eef950-e08e-45b8-8315-6bfd41f4c10d')
        .attach('file', Buffer.from(JSON.stringify(mockFile)), 'transactions.json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.data.errors).toEqual(validationErrors);
    });

    it('should return 404 if account not found', async () => {
      (transactionImportService.validateTransactions as jest.Mock).mockReturnValue([]);
      (transactionImportService.importTransactions as jest.Mock).mockRejectedValue(
        new Error('Account not found')
      );

      const mockFile = {
        transactions: [
          {
            amount: '-100.00',
            date: '2024-01-15T00:00:00Z',
            description: 'Test transaction',
          },
        ],
      };

      const response = await request(app)
        .post('/api/financial/transactions/import')
        .set('Authorization', 'Bearer test-token')
        .field('accountId', 'non-existent-account')
        .attach('file', Buffer.from(JSON.stringify(mockFile)), 'transactions.json');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Account not found');
    });
  });

  describe('GET /api/financial/accounts', () => {
    it('should return user accounts', async () => {
      const mockAccounts = [
        {
          id: 'acc1',
          account_id: 'ACC001',
          name: 'Account 1',
          type: 'bank_account',
          currencies: { code: 'EUR', symbol: '€' },
        },
        {
          id: 'acc2',
          account_id: 'ACC002',
          name: 'Account 2',
          type: 'bank_account',
          currencies: { code: 'USD', symbol: '$' },
        },
      ];

      (transactionImportService.getUserAccounts as jest.Mock).mockResolvedValue(mockAccounts);

      const response = await request(app)
        .get('/api/financial/accounts')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAccounts);
      expect(response.body.count).toBe(2);
    });

    it('should return 401 if not authenticated', async () => {
      // Override auth middleware for this test
      jest.doMock('../../middleware/auth', () => ({
        authMiddleware: (req: any, res: any) => {
          res.status(401).json({ success: false, error: 'Unauthorized' });
        },
      }));

      const response = await request(app)
        .get('/api/financial/accounts');

      expect(response.status).toBe(401);
    });
  });
});