import { TransactionManagementService } from '../transaction-management.service';

// Mock Prisma Client
const mockPrismaClient = {
  transactions: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  client_transaction_links: {
    deleteMany: jest.fn(),
  },
  transaction_categorizations: {
    deleteMany: jest.fn(),
  },
};

// Mock the module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('TransactionManagementService', () => {
  let service: TransactionManagementService;
  let mockTransaction: any;

  beforeEach(() => {
    service = new TransactionManagementService();

    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock transaction data
    mockTransaction = {
      id: 'trans-123',
      transaction_id: 'TRANS-123',
      amount: '100.00',
      description: 'Test transaction',
      date: new Date('2025-01-01'),
      currency_id: 'currency-123',
      account_id: 'account-123',
      type: 'debit',
      status: 'confirmed',
    };
  });

  describe('deleteTransaction', () => {
    it('should successfully delete a transaction and its related records', async () => {
      // Arrange
      const transactionId = 'trans-123';
      const userId = 'user-123';

      mockPrismaClient.transactions.findUnique.mockResolvedValue(mockTransaction);
      mockPrismaClient.client_transaction_links.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.transaction_categorizations.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.transactions.delete.mockResolvedValue(mockTransaction);

      // Act
      await service.deleteTransaction(transactionId, userId);

      // Assert
      expect(mockPrismaClient.transactions.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
      });

      expect(mockPrismaClient.client_transaction_links.deleteMany).toHaveBeenCalledWith({
        where: { transaction_id: transactionId },
      });

      expect(mockPrismaClient.transaction_categorizations.deleteMany).toHaveBeenCalledWith({
        where: { transaction_id: transactionId },
      });

      expect(mockPrismaClient.transactions.delete).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
    });

    it('should throw error when transaction does not exist', async () => {
      // Arrange
      const transactionId = 'non-existent-id';
      const userId = 'user-123';

      mockPrismaClient.transactions.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteTransaction(transactionId, userId))
        .rejects
        .toThrow('Transaction not found');

      expect(mockPrismaClient.transactions.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
      });

      // Should not attempt to delete anything
      expect(mockPrismaClient.client_transaction_links.deleteMany).not.toHaveBeenCalled();
      expect(mockPrismaClient.transaction_categorizations.deleteMany).not.toHaveBeenCalled();
      expect(mockPrismaClient.transactions.delete).not.toHaveBeenCalled();
    });

    it('should delete transaction even if no related records exist', async () => {
      // Arrange
      const transactionId = 'trans-123';
      const userId = 'user-123';

      mockPrismaClient.transactions.findUnique.mockResolvedValue(mockTransaction);
      mockPrismaClient.client_transaction_links.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.transaction_categorizations.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.transactions.delete.mockResolvedValue(mockTransaction);

      // Act
      await service.deleteTransaction(transactionId, userId);

      // Assert
      expect(mockPrismaClient.transactions.delete).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
    });

    it('should handle deletion order correctly (related records first)', async () => {
      // Arrange
      const transactionId = 'trans-123';
      const userId = 'user-123';
      const callOrder: string[] = [];

      mockPrismaClient.transactions.findUnique.mockResolvedValue(mockTransaction);
      
      mockPrismaClient.client_transaction_links.deleteMany.mockImplementation(() => {
        callOrder.push('client_transaction_links');
        return Promise.resolve({ count: 1 });
      });
      
      mockPrismaClient.transaction_categorizations.deleteMany.mockImplementation(() => {
        callOrder.push('transaction_categorizations');
        return Promise.resolve({ count: 1 });
      });
      
      mockPrismaClient.transactions.delete.mockImplementation(() => {
        callOrder.push('transactions');
        return Promise.resolve(mockTransaction);
      });

      // Act
      await service.deleteTransaction(transactionId, userId);

      // Assert - Verify deletion order
      expect(callOrder).toEqual([
        'client_transaction_links',
        'transaction_categorizations',
        'transactions'
      ]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const transactionId = 'trans-123';
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      mockPrismaClient.transactions.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.deleteTransaction(transactionId, userId))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('getTransaction', () => {
    it('should return a transaction when it exists', async () => {
      // Arrange
      const transactionId = 'trans-123';
      mockPrismaClient.transactions.findUnique.mockResolvedValue(mockTransaction);

      // Act
      const result = await service.getTransaction(transactionId);

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(mockPrismaClient.transactions.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
    });

    it('should return null when transaction does not exist', async () => {
      // Arrange
      const transactionId = 'non-existent-id';
      mockPrismaClient.transactions.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getTransaction(transactionId);

      // Assert
      expect(result).toBeNull();
    });
  });
});