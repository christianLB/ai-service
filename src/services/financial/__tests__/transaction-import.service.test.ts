import { TransactionImportService } from '../transaction-import.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    accounts: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    transactions: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrismaClient) };
});

describe('TransactionImportService', () => {
  let service: TransactionImportService;
  let prisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionImportService();
    prisma = new PrismaClient();
  });

  describe('importTransactions', () => {
    const mockAccountId = '44eef950-e08e-45b8-8315-6bfd41f4c10d';
    const mockUserId = 'test-user';
    const mockAccount = {
      id: mockAccountId,
      account_id: 'ACC123',
      name: 'Test Account',
      currency_id: '32e61502-edc4-48fe-8473-e54d97eb8198',
    };

    const mockTransactions = [
      {
        amount: '-100.50',
        date: '2024-01-15',
        description: 'Test transaction 1',
        type: 'bank_transfer',
      },
      {
        amount: '200.00',
        date: '2024-01-16',
        description: 'Test transaction 2',
        type: 'bank_transfer',
      },
    ];

    it('should successfully import new transactions', async () => {
      prisma.accounts.findUnique.mockResolvedValue(mockAccount);
      prisma.transactions.findUnique.mockResolvedValue(null);
      prisma.transactions.create.mockResolvedValue({ id: 'new-transaction-id' });

      const result = await service.importTransactions(mockAccountId, mockTransactions, mockUserId);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);

      expect(prisma.accounts.findUnique).toHaveBeenCalledWith({
        where: { id: mockAccountId },
      });

      expect(prisma.transactions.create).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicate transactions', async () => {
      prisma.accounts.findUnique.mockResolvedValue(mockAccount);
      prisma.transactions.findUnique.mockResolvedValue({ id: 'existing-id' });

      const result = await service.importTransactions(mockAccountId, mockTransactions, mockUserId);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(2);
      expect(result.duplicates).toHaveLength(2);
      expect(prisma.transactions.create).not.toHaveBeenCalled();
    });

    it('should throw error if account not found', async () => {
      prisma.accounts.findUnique.mockResolvedValue(null);

      await expect(
        service.importTransactions(mockAccountId, mockTransactions, mockUserId)
      ).rejects.toThrow('Account not found');
    });

    it('should handle transaction creation errors', async () => {
      prisma.accounts.findUnique.mockResolvedValue(mockAccount);
      prisma.transactions.findUnique.mockResolvedValue(null);
      prisma.transactions.create.mockRejectedValue(new Error('DB Error'));

      const result = await service.importTransactions(mockAccountId, mockTransactions, mockUserId);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toBe('DB Error');
    });
  });

  describe('validateTransactions', () => {
    it('should return no errors for valid transactions', () => {
      const validTransactions = [
        {
          amount: '100.50',
          date: '2024-01-15',
          description: 'Valid transaction',
        },
      ];

      const errors = service.validateTransactions(validTransactions);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing amount', () => {
      const invalidTransactions = [
        {
          amount: '',
          date: '2024-01-15',
          description: 'Invalid transaction',
        },
      ];

      const errors = service.validateTransactions(invalidTransactions);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('Amount is required');
    });

    it('should return errors for missing date', () => {
      const invalidTransactions = [
        {
          amount: '100.00',
          date: '',
          description: 'Invalid transaction',
        },
      ];

      const errors = service.validateTransactions(invalidTransactions);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('Date is required');
    });

    it('should return errors for invalid date format', () => {
      const invalidTransactions = [
        {
          amount: '100.00',
          date: 'invalid-date',
          description: 'Invalid transaction',
        },
      ];

      const errors = service.validateTransactions(invalidTransactions);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('Invalid date format');
    });

    it('should return errors for invalid amount format', () => {
      const invalidTransactions = [
        {
          amount: 'not-a-number',
          date: '2024-01-15',
          description: 'Invalid transaction',
        },
      ];

      const errors = service.validateTransactions(invalidTransactions);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('Invalid amount format');
    });
  });

  describe('getUserAccounts', () => {
    it('should return user accounts', async () => {
      const mockAccounts = [
        {
          id: 'acc1',
          account_id: 'ACC001',
          name: 'Account 1',
          type: 'bank_account',
          institution: 'Bank A',
          currencies: { code: 'EUR', symbol: '€' },
        },
        {
          id: 'acc2',
          account_id: 'ACC002',
          name: 'Account 2',
          type: 'bank_account',
          institution: 'Bank B',
          currencies: { code: 'USD', symbol: '$' },
        },
      ];

      prisma.accounts.findMany.mockResolvedValue(mockAccounts);

      const accounts = await service.getUserAccounts('test-user');

      expect(accounts).toEqual(mockAccounts);
      expect(prisma.accounts.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          account_id: true,
          name: true,
          type: true,
          institution: true,
          iban: true,
          currency_id: true,
          currencies: {
            select: {
              code: true,
              symbol: true,
            },
          },
        },
      });
    });
  });
});
