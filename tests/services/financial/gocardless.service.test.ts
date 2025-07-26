import { GoCardlessService } from '../../../src/services/financial/gocardless.service';
import { FinancialDatabaseService } from '../../../src/services/financial/database.service';
import { Currency } from '../../../src/services/financial/types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock database
jest.mock('../../../src/services/financial/database.service');

describe('GoCardlessService', () => {
  let service: GoCardlessService;
  let mockDb: jest.Mocked<FinancialDatabaseService>;
  
  const mockConfig = {
    secretId: 'test-secret-id',
    secretKey: 'test-secret-key',
    sandboxMode: true
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock database
    mockDb = {
      getCurrencyByCode: jest.fn(),
      createAccount: jest.fn(),
      createTransaction: jest.fn(),
      updateAccountBalance: jest.fn(),
      query: jest.fn(),
      logSync: jest.fn()
    } as any;

    // Create axios instance mock
    const axiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };
    mockedAxios.create.mockReturnValue(axiosInstance as any);

    // Create service
    service = new GoCardlessService(mockConfig, mockDb);
    (service as any).client = axiosInstance as any;
  });

  describe('syncTransactionsToDatabase', () => {
    const mockAccountId = 'test-account-123';
    const mockDbAccountId = 'db-account-456';
    
    const mockEurCurrency: Currency = {
      id: 'eur-currency-id',
      code: 'EUR',
      name: 'Euro',
      type: 'fiat',
      decimals: 2,
      symbol: '€',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockGoCardlessTransaction = {
      transactionId: 'gc-trans-123',
      transactionAmount: { amount: '100.50', currency: 'EUR' },
      bookingDate: '2025-01-26',
      valueDate: '2025-01-26',
      remittanceInformationUnstructured: 'Test payment',
      creditorName: 'Test Creditor',
      creditorAccount: { iban: 'ES1234567890' },
      internalTransactionId: 'internal-123',
      bankTransactionCode: 'SEPA',
      additionalInformation: 'Additional info'
    };

    beforeEach(() => {
      // Mock currency lookup
      mockDb.getCurrencyByCode.mockResolvedValue(mockEurCurrency);
      
      // Mock transaction check (not exists)
      mockDb.query.mockResolvedValue({ rows: [] });
      
      // Mock getAccountTransactions
      (service as any).getAccountTransactions = jest.fn()
        .mockResolvedValue([mockGoCardlessTransaction]);
      
      // Mock getAccountBalances  
      (service as any).getAccountBalances = jest.fn()
        .mockResolvedValue([{ balanceAmount: { amount: '1000.00' } }]);
    });

    it('should correctly map GoCardless transaction fields to database fields', async () => {
      // Act
      await service.syncTransactionsToDatabase(mockAccountId, mockDbAccountId, 7);

      // Assert - Check that createTransaction was called with correct field mapping
      expect(mockDb.createTransaction).toHaveBeenCalledWith({
        accountId: mockDbAccountId, // This should map to account_id in DB
        type: 'bank_transfer',
        status: 'confirmed',
        amount: '100.50',
        currencyId: 'eur-currency-id',
        description: 'Test payment',
        reference: 'gc-trans-123', // This should map to transaction_id in DB
        date: new Date('2025-01-26'),
        gocardlessData: mockGoCardlessTransaction,
        counterpartyName: 'Test Creditor',
        counterpartyAccount: 'ES1234567890',
        metadata: expect.objectContaining({
          internal_transaction_id: 'internal-123',
          bank_transaction_code: 'SEPA',
          additional_information: 'Additional info',
          sync_date: expect.any(String),
          sync_batch: 'initial-7days'
        })
      });
    });

    it('should handle transactions without booking date', async () => {
      // Arrange - transaction with only valueDate
      const transactionWithoutBookingDate = {
        ...mockGoCardlessTransaction,
        bookingDate: null
      };
      (service as any).getAccountTransactions = jest.fn()
        .mockResolvedValue([transactionWithoutBookingDate]);

      // Act
      await service.syncTransactionsToDatabase(mockAccountId, mockDbAccountId);

      // Assert
      expect(mockDb.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending', // Should be pending without booking date
          date: new Date('2025-01-26') // Should use valueDate
        })
      );
    });

    it('should skip transactions without amount', async () => {
      // Arrange
      const transactionWithoutAmount = {
        ...mockGoCardlessTransaction,
        transactionAmount: null
      };
      (service as any).getAccountTransactions = jest.fn()
        .mockResolvedValue([transactionWithoutAmount]);

      // Act
      const result = await service.syncTransactionsToDatabase(mockAccountId, mockDbAccountId);

      // Assert
      expect(mockDb.createTransaction).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should skip existing transactions', async () => {
      // Arrange - transaction already exists
      mockDb.query.mockResolvedValue({ rows: [{ id: 'existing-trans' }] });

      // Act
      const result = await service.syncTransactionsToDatabase(mockAccountId, mockDbAccountId);

      // Assert
      expect(mockDb.createTransaction).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should update account balance after syncing transactions', async () => {
      // Act
      await service.syncTransactionsToDatabase(mockAccountId, mockDbAccountId);

      // Assert
      expect(mockDb.updateAccountBalance).toHaveBeenCalledWith(
        mockDbAccountId,
        '1000.00'
      );
    });

    it('should handle rate limit errors (429)', async () => {
      // Arrange
      const rateLimitError = {
        response: {
          status: 429,
          headers: {
            'retry-after': '86400'
          }
        }
      };
      (service as any).getAccountTransactions = jest.fn()
        .mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(service.syncTransactionsToDatabase(mockAccountId, mockDbAccountId))
        .rejects.toMatchObject(rateLimitError);
    });

    it('should handle missing EUR currency', async () => {
      // Arrange
      mockDb.getCurrencyByCode.mockResolvedValue(null);

      // Act & Assert
      await expect(service.syncTransactionsToDatabase(mockAccountId, mockDbAccountId))
        .rejects.toThrow('EUR currency not found in database');
    });

    it('should continue syncing even if individual transaction fails', async () => {
      // Arrange - multiple transactions, one fails
      const transactions = [
        mockGoCardlessTransaction,
        { ...mockGoCardlessTransaction, transactionId: 'gc-trans-124' },
        { ...mockGoCardlessTransaction, transactionId: 'gc-trans-125' }
      ];
      (service as any).getAccountTransactions = jest.fn()
        .mockResolvedValue(transactions);
      
      // Make second transaction fail
      mockDb.createTransaction
        .mockResolvedValueOnce({ id: 'created-1' } as any)
        .mockRejectedValueOnce(new Error('DB constraint error'))
        .mockResolvedValueOnce({ id: 'created-3' } as any);

      // Act
      const result = await service.syncTransactionsToDatabase(mockAccountId, mockDbAccountId);

      // Assert
      expect(result).toBe(2); // Should sync 2 out of 3
      expect(mockDb.createTransaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleRateLimit', () => {
    it('should extract retry-after from 429 response', () => {
      // Arrange
      const error = {
        response: {
          status: 429,
          headers: {
            'retry-after': '3600'
          }
        }
      };

      // Act
      const result = (service as any).handleRateLimit(error);

      // Assert
      expect(result).toEqual({
        isRateLimited: true,
        retryAfter: 3600,
        message: expect.stringContaining('1 hours')
      });
    });

    it('should handle non-429 errors', () => {
      // Arrange
      const error = {
        response: {
          status: 500
        }
      };

      // Act
      const result = (service as any).handleRateLimit(error);

      // Assert
      expect(result).toEqual({
        isRateLimited: false,
        retryAfter: null,
        message: null
      });
    });
  });
});