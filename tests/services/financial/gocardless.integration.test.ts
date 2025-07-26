import { GoCardlessService } from '../../../src/services/financial/gocardless.service';
import { FinancialDatabaseService } from '../../../src/services/financial/database.service';
import { Pool } from 'pg';

describe('GoCardless Integration Tests', () => {
  let service: GoCardlessService;
  let db: FinancialDatabaseService;
  let pool: Pool;
  
  // Test database configuration
  const testDbConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5434'),
    database: process.env.POSTGRES_DB || 'ai_service_test',
    user: process.env.POSTGRES_USER || 'ai_user',
    password: process.env.POSTGRES_PASSWORD || 'ai_password'
  };

  beforeAll(async () => {
    // Create database connection
    db = new FinancialDatabaseService(testDbConfig);
    pool = db.pool;
    
    // Initialize database
    await db.initialize();
    
    // Create GoCardless service with test config
    const gcConfig = {
      secretId: process.env.GO_SECRET_ID || 'test-secret',
      secretKey: process.env.GO_SECRET_KEY || 'test-key',
      sandboxMode: true
    };
    
    service = new GoCardlessService(gcConfig, db);
  });

  afterAll(async () => {
    // Clean up
    await db.close();
  });

  beforeEach(async () => {
    // Clear test data
    await pool.query('DELETE FROM financial.transactions WHERE metadata->>\'test\' = \'true\'');
    await pool.query('DELETE FROM financial.sync_logs WHERE message LIKE \'%TEST%\'');
  });

  describe('Transaction Sync Integration', () => {
    it('should successfully insert a transaction with correct field mapping', async () => {
      // Arrange - Create test account
      const testAccount = await createTestAccount();
      
      // Create mock transaction data that simulates GoCardless response
      const mockTransaction = {
        transactionId: 'test-trans-' + Date.now(),
        transactionAmount: { amount: '150.00', currency: 'EUR' },
        bookingDate: '2025-01-26',
        valueDate: '2025-01-26',
        remittanceInformationUnstructured: 'TEST: Integration test payment',
        creditorName: 'Test Integration Creditor',
        creditorAccount: { iban: 'ES9121000418450200051332' },
        debtorName: null,
        debtorAccount: null,
        internalTransactionId: 'internal-test-123',
        bankTransactionCode: 'PMNT-RCDT-ESCT',
        additionalInformation: 'Test additional info'
      };

      // Act - Directly test the transaction creation logic
      const transaction = await db.createTransaction({
        accountId: testAccount.id,
        type: 'bank_transfer',
        status: 'confirmed',
        amount: mockTransaction.transactionAmount.amount,
        currencyId: testAccount.currency_id,
        description: mockTransaction.remittanceInformationUnstructured,
        reference: mockTransaction.transactionId,
        date: new Date(mockTransaction.bookingDate),
        gocardlessData: mockTransaction,
        counterpartyName: mockTransaction.creditorName,
        counterpartyAccount: mockTransaction.creditorAccount.iban,
        metadata: {
          test: true,
          internal_transaction_id: mockTransaction.internalTransactionId,
          bank_transaction_code: mockTransaction.bankTransactionCode,
          additional_information: mockTransaction.additionalInformation,
          sync_date: new Date().toISOString()
        }
      });

      // Assert - Verify transaction was created correctly
      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      
      // Query database directly to verify field mapping
      const result = await pool.query(
        `SELECT 
          id,
          transaction_id,
          account_id,
          amount,
          description,
          reference,
          counterparty_name,
          counterparty_account,
          metadata,
          gocardless_data
        FROM financial.transactions 
        WHERE id = $1`,
        [transaction.id]
      );

      const savedTransaction = result.rows[0];
      
      // Verify critical field mappings
      expect(savedTransaction.transaction_id).toBe(mockTransaction.transactionId);
      expect(savedTransaction.account_id).toBe(testAccount.id);
      expect(savedTransaction.amount).toBe('150.00000000');
      expect(savedTransaction.reference).toBe(mockTransaction.transactionId);
      expect(savedTransaction.counterparty_name).toBe('Test Integration Creditor');
      expect(savedTransaction.counterparty_account).toBe('ES9121000418450200051332');
      expect(savedTransaction.metadata.test).toBe(true);
      expect(savedTransaction.gocardless_data).toEqual(mockTransaction);
    });

    it('should handle sync_logs correctly', async () => {
      // Arrange
      const testAccountId = 'test-account-' + Date.now();
      
      // Act - Log a sync operation
      await db.logSync({
        accountId: testAccountId,
        status: 'success',
        syncedTransactions: 5,
        message: 'TEST: Integration test sync',
        operationType: 'transactions'
      });

      // Assert - Verify log was created
      const result = await pool.query(
        `SELECT * FROM financial.sync_logs 
         WHERE account_id = $1 
         AND message = 'TEST: Integration test sync'`,
        [testAccountId]
      );

      const log = result.rows[0];
      expect(log).toBeDefined();
      expect(log.status).toBe('success');
      expect(log.synced_transactions).toBe(5);
      expect(log.operation_type).toBe('transactions');
    });

    it('should reject duplicate transactions', async () => {
      // Arrange
      const testAccount = await createTestAccount();
      const duplicateReference = 'duplicate-ref-' + Date.now();
      
      // Create first transaction
      const firstTransaction = await db.createTransaction({
        accountId: testAccount.id,
        type: 'bank_transfer',
        status: 'confirmed',
        amount: '100.00',
        currencyId: testAccount.currency_id,
        description: 'First transaction',
        reference: duplicateReference,
        date: new Date(),
        metadata: { test: true }
      });

      // Act & Assert - Try to create duplicate
      // Note: The actual implementation should check for duplicates
      // This test verifies the database constraint works
      try {
        await db.createTransaction({
          accountId: testAccount.id,
          type: 'bank_transfer',
          status: 'confirmed',
          amount: '100.00',
          currencyId: testAccount.currency_id,
          description: 'Duplicate transaction',
          reference: duplicateReference,
          date: new Date(),
          metadata: { test: true }
        });
        
        // If no error, check if it's the same transaction
        const result = await pool.query(
          'SELECT COUNT(*) as count FROM financial.transactions WHERE reference = $1',
          [duplicateReference]
        );
        
        // Should only have one transaction with this reference
        expect(parseInt(result.rows[0].count)).toBe(1);
      } catch (error) {
        // Expected: duplicate key violation
        expect(error.message).toContain('duplicate');
      }
    });

    it('should update account balance correctly', async () => {
      // Arrange
      const testAccount = await createTestAccount();
      const initialBalance = '1000.00';
      
      // Set initial balance
      await db.updateAccountBalance(testAccount.id, initialBalance);
      
      // Act - Update balance
      const newBalance = '1500.50';
      await db.updateAccountBalance(testAccount.id, newBalance);
      
      // Assert
      const result = await pool.query(
        'SELECT balance FROM financial.accounts WHERE id = $1',
        [testAccount.id]
      );
      
      expect(result.rows[0].balance).toBe('1500.50000000');
    });
  });

  // Helper function to create test account
  async function createTestAccount() {
    // Get EUR currency
    const eurCurrency = await db.getCurrencyByCode('EUR');
    if (!eurCurrency) {
      throw new Error('EUR currency not found - ensure migrations are run');
    }

    const accountData = {
      name: 'TEST Account ' + Date.now(),
      type: 'bank_account',
      currencyId: eurCurrency.id,
      accountId: 'test-acc-' + Date.now(),
      institutionId: 'TEST_BANK',
      requisitionId: 'test-req-' + Date.now(),
      iban: 'ES' + Math.random().toString().slice(2, 26),
      balance: '0',
      isActive: true,
      metadata: { test: true }
    };

    return await db.createAccount(accountData);
  }
});