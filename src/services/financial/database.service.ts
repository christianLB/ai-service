// Financial Database Service - Crypto-Ready PostgreSQL
import { Pool, PoolClient } from 'pg';
import {
  Currency,
  Customer,
  Account,
  Transaction,
  Invoice,
  InvoiceItem,
  TransactionInvoiceLink,
  ExchangeRate,
  PaginatedResponse
} from './types';

export class FinancialDatabaseService {
  public pool: Pool;

  constructor(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    this.pool = new Pool({
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Test connection
      await client.query('SELECT NOW()');
      console.log('Financial database connected successfully');
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Public method for raw queries (use with caution)
  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  // ============================================================================
  // CURRENCY OPERATIONS
  // ============================================================================

  async getCurrencies(): Promise<Currency[]> {
    const query = `
      SELECT id, code, name, type, decimals, symbol, is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.currencies 
      WHERE is_active = true
      ORDER BY type, code
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getCurrencyByCode(code: string): Promise<Currency | null> {
    const query = `
      SELECT id, code, name, type, decimals, symbol, is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.currencies 
      WHERE code = $1 AND is_active = true
    `;
    const result = await this.pool.query(query, [code]);
    return result.rows[0] || null;
  }

  async createCurrency(currency: Omit<Currency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Currency> {
    const query = `
      INSERT INTO financial.currencies (code, name, type, decimals, symbol, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, code, name, type, decimals, symbol, is_active as "isActive",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [currency.code, currency.name, currency.type, currency.decimals, currency.symbol, currency.isActive];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================

  async getCustomers(page = 1, limit = 50): Promise<PaginatedResponse<Customer>> {
    const offset = (page - 1) * limit;

    const countQuery = 'SELECT COUNT(*) FROM financial.customers WHERE is_active = true';
    const countResult = await this.pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT id, name, email, tax_id as "taxId", address, type, metadata, 
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.customers 
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, [limit, offset]);

    return {
      items: result.rows,
      total,
      page,
      limit,
      hasNext: offset + limit < total,
      hasPrev: page > 1
    };
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const query = `
      SELECT id, name, email, tax_id as "taxId", address, type, metadata,
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.customers 
      WHERE id = $1 AND is_active = true
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const query = `
      INSERT INTO financial.customers (name, email, tax_id, address, type, metadata, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, tax_id as "taxId", address, type, metadata,
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [
      customer.name, customer.email, customer.taxId,
      customer.address, customer.type, customer.metadata, customer.isActive
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // ============================================================================
  // ACCOUNT OPERATIONS
  // ============================================================================

  async getAccounts(): Promise<Account[]> {
    const query = `
      SELECT id, name, type, currency_id as "currencyId", account_id as "accountId",
             institution_id as "institutionId", requisition_id as "requisitionId", iban,
             wallet_address as "walletAddress", chain_id as "chainId", 
             exchange_name as "exchangeName", balance, is_active as "isActive",
             metadata, created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.accounts 
      WHERE is_active = true
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getAccountById(id: string): Promise<Account | null> {
    const query = `
      SELECT id, name, type, currency_id as "currencyId", account_id as "accountId",
             institution_id as "institutionId", requisition_id as "requisitionId", iban,
             wallet_address as "walletAddress", chain_id as "chainId", 
             exchange_name as "exchangeName", balance, is_active as "isActive",
             metadata, created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.accounts 
      WHERE id = $1 AND is_active = true
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const query = `
      INSERT INTO financial.accounts (
        name, type, currency_id, account_id, institution_id, requisition_id, iban,
        wallet_address, chain_id, exchange_name, balance, is_active, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, name, type, currency_id as "currencyId", account_id as "accountId",
                institution_id as "institutionId", requisition_id as "requisitionId", iban,
                wallet_address as "walletAddress", chain_id as "chainId", 
                exchange_name as "exchangeName", balance, is_active as "isActive",
                metadata, created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [
      account.name, account.type, account.currencyId, account.accountId,
      account.institutionId, account.requisitionId, account.iban,
      account.walletAddress, account.chainId, account.exchangeName,
      account.balance, account.isActive, account.metadata
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateAccountBalance(id: string, balance: string): Promise<void> {
    const query = 'UPDATE financial.accounts SET balance = $1 WHERE id = $2';
    await this.pool.query(query, [balance, id]);
  }

  // ============================================================================
  // TRANSACTION OPERATIONS
  // ============================================================================

  async getTransactions(accountId?: string, page = 1, limit = 50, sortBy = 'date', sortOrder = 'desc'): Promise<PaginatedResponse<Transaction>> {
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams: any[] = [limit, offset];

    if (accountId) {
      whereClause = 'WHERE account_id = $3';
      queryParams.push(accountId);
    }

    const countQuery = `SELECT COUNT(*) FROM financial.transactions ${accountId ? 'WHERE account_id = $1' : ''}`;
    const countResult = await this.pool.query(countQuery, accountId ? [accountId] : []);
    const total = parseInt(countResult.rows[0].count);

    // Map frontend column names to database columns
    const columnMap: Record<string, string> = {
      date: 'date',
      amount: 'amount',
      description: 'description',
      status: 'status',
      type: 'type'
    };

    // Validate and sanitize sort column
    const sortColumn = columnMap[sortBy] || 'date';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT id, account_id as "accountId", type, status, amount, currency_id as "currencyId",
             description, reference, date, gocardless_data as "gocardlessData",
             transaction_hash as "transactionHash", block_number as "blockNumber",
             gas_used as "gasUsed", gas_price as "gasPrice", from_address as "fromAddress",
             to_address as "toAddress", counterparty_name as "counterpartyName",
             counterparty_account as "counterpartyAccount", fee_amount as "feeAmount",
             fee_currency_id as "feeCurrencyId", metadata,
             created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.transactions 
      ${whereClause}
      ORDER BY ${sortColumn} ${order}, created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, queryParams);

    return {
      items: result.rows,
      total,
      page,
      limit,
      hasNext: offset + limit < total,
      hasPrev: page > 1
    };
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const query = `
      SELECT id, account_id as "accountId", type, status, amount, currency_id as "currencyId",
             description, reference, date, gocardless_data as "gocardlessData",
             transaction_hash as "transactionHash", block_number as "blockNumber",
             gas_used as "gasUsed", gas_price as "gasPrice", from_address as "fromAddress",
             to_address as "toAddress", counterparty_name as "counterpartyName",
             counterparty_account as "counterpartyAccount", fee_amount as "feeAmount",
             fee_currency_id as "feeCurrencyId", metadata,
             created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.transactions 
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const query = `
      INSERT INTO financial.transactions (
        transaction_id, account_id, type, status, amount, currency_id, description, reference, date,
        gocardless_data, transaction_hash, block_number, gas_used, gas_price,
        from_address, to_address, counterparty_name, counterparty_account,
        fee_amount, fee_currency_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id, transaction_id as "transactionId", account_id as "accountId", type, status, amount, currency_id as "currencyId",
                description, reference, date, gocardless_data as "gocardlessData",
                transaction_hash as "transactionHash", block_number as "blockNumber",
                gas_used as "gasUsed", gas_price as "gasPrice", from_address as "fromAddress",
                to_address as "toAddress", counterparty_name as "counterpartyName",
                counterparty_account as "counterpartyAccount", fee_amount as "feeAmount",
                fee_currency_id as "feeCurrencyId", metadata,
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [
      transaction.transactionId, transaction.accountId, transaction.type, transaction.status, transaction.amount,
      transaction.currencyId, transaction.description, transaction.reference, transaction.date,
      transaction.gocardlessData, transaction.transactionHash, transaction.blockNumber,
      transaction.gasUsed, transaction.gasPrice, transaction.fromAddress, transaction.toAddress,
      transaction.counterpartyName, transaction.counterpartyAccount, transaction.feeAmount,
      transaction.feeCurrencyId, transaction.metadata
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateTransactionStatus(id: string, status: string): Promise<void> {
    const query = 'UPDATE financial.transactions SET status = $1 WHERE id = $2';
    await this.pool.query(query, [status, id]);
  }

  // ============================================================================
  // INVOICE OPERATIONS
  // ============================================================================

  async getInvoices(customerId?: string, page = 1, limit = 50): Promise<PaginatedResponse<Invoice>> {
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams: any[] = [limit, offset];

    if (customerId) {
      whereClause = 'WHERE customer_id = $3';
      queryParams.push(customerId);
    }

    const countQuery = `SELECT COUNT(*) FROM financial.invoices ${whereClause}`;
    const countResult = await this.pool.query(countQuery, customerId ? [customerId] : []);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT id, customer_id as "customerId", invoice_number as "invoiceNumber",
             title, description, subtotal, tax_amount as "taxAmount", 
             total_amount as "totalAmount", currency_id as "currencyId",
             issue_date as "issueDate", due_date as "dueDate", paid_date as "paidDate",
             status, amount_paid as "amountPaid", metadata,
             created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.invoices 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, queryParams);

    return {
      items: result.rows,
      total,
      page,
      limit,
      hasNext: offset + limit < total,
      hasPrev: page > 1
    };
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const query = `
      INSERT INTO financial.invoices (
        customer_id, invoice_number, title, description, subtotal, tax_amount,
        total_amount, currency_id, issue_date, due_date, paid_date, status,
        amount_paid, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, customer_id as "customerId", invoice_number as "invoiceNumber",
                title, description, subtotal, tax_amount as "taxAmount", 
                total_amount as "totalAmount", currency_id as "currencyId",
                issue_date as "issueDate", due_date as "dueDate", paid_date as "paidDate",
                status, amount_paid as "amountPaid", metadata,
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [
      invoice.customerId, invoice.invoiceNumber, invoice.title, invoice.description,
      invoice.subtotal, invoice.taxAmount, invoice.totalAmount, invoice.currencyId,
      invoice.issueDate, invoice.dueDate, invoice.paidDate, invoice.status,
      invoice.amountPaid, invoice.metadata
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // ============================================================================
  // RECONCILIATION OPERATIONS
  // ============================================================================

  async linkTransactionToInvoice(link: Omit<TransactionInvoiceLink, 'id' | 'createdAt'>): Promise<TransactionInvoiceLink> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create the link
      const linkQuery = `
        INSERT INTO financial.transaction_invoice_links 
        (transaction_id, invoice_id, amount_allocated, currency_id, exchange_rate, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, transaction_id as "transactionId", invoice_id as "invoiceId",
                  amount_allocated as "amountAllocated", currency_id as "currencyId",
                  exchange_rate as "exchangeRate", notes, created_at as "createdAt"
      `;
      const linkResult = await client.query(linkQuery, [
        link.transactionId, link.invoiceId, link.amountAllocated,
        link.currencyId, link.exchangeRate, link.notes
      ]);

      // Update invoice amount paid
      const updateInvoiceQuery = `
        UPDATE financial.invoices 
        SET amount_paid = amount_paid + $1,
            status = CASE 
              WHEN (amount_paid + $1) >= total_amount THEN 'paid'::financial.invoice_status
              WHEN (amount_paid + $1) > 0 THEN 'partial_paid'::financial.invoice_status
              ELSE status
            END
        WHERE id = $2
      `;
      await client.query(updateInvoiceQuery, [link.amountAllocated, link.invoiceId]);

      await client.query('COMMIT');
      return linkResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // REPORTING QUERIES
  // ============================================================================

  async getAccountSummary(accountId: string): Promise<any> {
    const query = `
      SELECT 
        a.name,
        a.type,
        a.balance,
        c.code as currency_code,
        c.symbol as currency_symbol,
        COUNT(t.id) as transaction_count,
        SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_inflow,
        SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_outflow
      FROM financial.accounts a
      LEFT JOIN financial.currencies c ON a.currency_id = c.id
      LEFT JOIN financial.transactions t ON a.id = t.account_id
      WHERE a.id = $1
      GROUP BY a.id, a.name, a.type, a.balance, c.code, c.symbol
    `;
    const result = await this.pool.query(query, [accountId]);
    return result.rows[0] || null;
  }

  async getUnpaidInvoices(): Promise<Invoice[]> {
    const query = `
      SELECT id, customer_id as "customerId", invoice_number as "invoiceNumber",
             title, description, subtotal, tax_amount as "taxAmount", 
             total_amount as "totalAmount", currency_id as "currencyId",
             issue_date as "issueDate", due_date as "dueDate", paid_date as "paidDate",
             status, amount_paid as "amountPaid", metadata,
             created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.invoices 
      WHERE status IN ('sent', 'partial_paid', 'overdue')
      ORDER BY due_date ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  // ============================================================================
  // SYNC LOGGING
  // ============================================================================

  async logSync(data: {
    accountId: string;
    status: 'success' | 'failure';
    syncedTransactions: number;
    message?: string;
    operationType?: string;
  }): Promise<void> {
    const query = `
      INSERT INTO financial.sync_logs (
        account_id, status, synced_transactions, message, operation_type
      )
      VALUES ($1, $2, $3, $4, $5)
    `;
    const values = [
      data.accountId,
      data.status,
      data.syncedTransactions,
      data.message || null,
      data.operationType || 'full'
    ];
    await this.pool.query(query, values);
  }
}