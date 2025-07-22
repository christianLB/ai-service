import { db as DatabaseService } from '../database';
import { Client, ClientModel, ClientStats, ClientTransaction } from '../../models/financial/client.model';
import { logger } from '../../utils/log';

export class ClientManagementService {
  private database: typeof DatabaseService;

  constructor() {
    this.database = DatabaseService;
  }

  /**
   * Create a new client
   */
  async createClient(clientData: Partial<Client>): Promise<Client> {
    const client = new ClientModel(clientData);
    const dbClient = await this.database.pool.connect();

    try {
      await dbClient.query('BEGIN');

      // Check if client with same tax ID exists
      const existingCheck = await dbClient.query(
        'SELECT id FROM financial.clients WHERE tax_id = $1 AND tax_id_type = $2',
        [client.taxId, client.taxIdType]
      );

      if (existingCheck.rows.length > 0) {
        throw new Error(`Client with ${client.taxIdType} ${client.taxId} already exists`);
      }

      // Insert new client
      const query = `
        INSERT INTO financial.clients (
          id, name, business_name, tax_id, tax_id_type,
          email, phone, address,
          client_type, currency, language, timezone,
          payment_terms, payment_method, bank_account, credit_limit,
          status, custom_fields, tags, notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *`;

      const values = [
        client.id, client.name, client.businessName, client.taxId, client.taxIdType,
        client.email, client.phone, JSON.stringify(client.address),
        client.clientType, client.currency, client.language, client.timezone,
        client.paymentTerms, client.paymentMethod, client.bankAccount, client.creditLimit,
        client.status, JSON.stringify(client.customFields), client.tags, client.notes, client.createdBy
      ];

      const result = await dbClient.query(query, values);
      await dbClient.query('COMMIT');

      logger.info(`✅ Client created: ${client.name} (${client.taxId})`);
      return this.mapRowToClient(result.rows[0]);

    } catch (error: any) {
      await dbClient.query('ROLLBACK');
      logger.error('❌ Error creating client:', error);
      throw error;
    } finally {
      dbClient.release();
    }
  }

  /**
   * Get client by ID
   */
  async getClient(id: string): Promise<Client | null> {
    const dbClient = await this.database.pool.connect();

    try {
      const result = await dbClient.query(
        'SELECT * FROM financial.clients WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToClient(result.rows[0]);
    } finally {
      dbClient.release();
    }
  }

  /**
   * Get client by tax ID
   */
  async getClientByTaxId(taxId: string, taxIdType?: string): Promise<Client | null> {
    const dbClient = await this.database.pool.connect();

    try {
      let query = 'SELECT * FROM financial.clients WHERE tax_id = $1';
      const params: any[] = [taxId];

      if (taxIdType) {
        query += ' AND tax_id_type = $2';
        params.push(taxIdType);
      }

      const result = await dbClient.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToClient(result.rows[0]);
    } finally {
      dbClient.release();
    }
  }

  /**
   * Update client information
   */
  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const dbClient = await this.database.pool.connect();

    try {
      await dbClient.query('BEGIN');

      // Get current client
      const currentClient = await this.getClient(id);
      if (!currentClient) {
        throw new Error('Client not found');
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const allowedFields = [
        'name', 'business_name', 'email', 'phone', 'address',
        'currency', 'language', 'timezone', 'payment_terms',
        'payment_method', 'bank_account', 'credit_limit',
        'status', 'custom_fields', 'tags', 'notes',
        'tax_id', 'tax_id_type', 'client_type'
      ];

      for (const field of allowedFields) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (updates[field as keyof Client] !== undefined) {
          updateFields.push(`${dbField} = $${paramCount}`);
          
          // Handle JSON fields
          if (['address', 'custom_fields'].includes(field)) {
            values.push(JSON.stringify(updates[field as keyof Client]));
          } else {
            values.push(updates[field as keyof Client]);
          }
          
          paramCount++;
        }
      }

      if (updateFields.length === 0) {
        return currentClient;
      }

      // Add updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Execute update
      const query = `
        UPDATE financial.clients 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *`;

      values.push(id);
      const result = await dbClient.query(query, values);
      await dbClient.query('COMMIT');

      logger.info(`✅ Client updated: ${id}`);
      return this.mapRowToClient(result.rows[0]);

    } catch (error: any) {
      await dbClient.query('ROLLBACK');
      logger.error('❌ Error updating client:', error);
      throw error;
    } finally {
      dbClient.release();
    }
  }

  /**
   * List clients with optional filters
   */
  async listClients(options: {
    status?: string;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<{ clients: Client[]; total: number }> {
    const dbClient = await this.database.pool.connect();

    try {
      let query = 'SELECT * FROM financial.clients WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) FROM financial.clients WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      // Add filters
      if (options.status) {
        query += ` AND status = $${paramCount}`;
        countQuery += ` AND status = $${paramCount}`;
        params.push(options.status);
        paramCount++;
      }

      if (options.search) {
        query += ` AND (
          LOWER(name) LIKE LOWER($${paramCount}) OR
          LOWER(business_name) LIKE LOWER($${paramCount}) OR
          LOWER(email) LIKE LOWER($${paramCount}) OR
          tax_id LIKE $${paramCount}
        )`;
        countQuery += ` AND (
          LOWER(name) LIKE LOWER($${paramCount}) OR
          LOWER(business_name) LIKE LOWER($${paramCount}) OR
          LOWER(email) LIKE LOWER($${paramCount}) OR
          tax_id LIKE $${paramCount}
        )`;
        params.push(`%${options.search}%`);
        paramCount++;
      }

      if (options.tags && options.tags.length > 0) {
        query += ` AND tags && $${paramCount}`;
        countQuery += ` AND tags && $${paramCount}`;
        params.push(options.tags);
        paramCount++;
      }

      // Get total count
      const countResult = await dbClient.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add sorting
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'DESC';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Add pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      // Execute query
      const result = await dbClient.query(query, params);
      const clients = result.rows.map(row => this.mapRowToClient(row));

      return { clients, total };

    } finally {
      dbClient.release();
    }
  }

  /**
   * Get client statistics
   */
  async getClientStats(clientId: string): Promise<ClientStats> {
    const dbClient = await this.database.pool.connect();

    try {
      const result = await dbClient.query(
        'SELECT * FROM financial.client_statistics WHERE client_id = $1',
        [clientId]
      );

      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }

      const row = result.rows[0];
      return {
        clientId: row.client_id,
        totalRevenue: parseFloat(row.total_revenue),
        totalInvoices: parseInt(row.total_invoices),
        paidInvoices: parseInt(row.paid_invoices),
        pendingInvoices: parseInt(row.pending_invoices),
        overdueInvoices: parseInt(row.overdue_invoices),
        averagePaymentDays: parseFloat(row.average_payment_days) || 0,
        lastPaymentDate: row.last_payment_date,
        riskScore: row.risk_score
      };

    } finally {
      dbClient.release();
    }
  }

  /**
   * Get client transactions (invoices and payments)
   */
  async getClientTransactions(
    clientId: string, 
    options: { 
      type?: string; 
      startDate?: Date; 
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ClientTransaction[]> {
    const dbClient = await this.database.pool.connect();

    try {
      let query = `
        SELECT 
          i.client_id,
          t.id as transaction_id,
          i.id as invoice_id,
          COALESCE(t.amount, i.total) as amount,
          CASE 
            WHEN t.id IS NOT NULL THEN 'payment'
            ELSE 'invoice'
          END as type,
          CASE
            WHEN t.id IS NOT NULL THEN 'completed'
            ELSE i.status
          END as status,
          COALESCE(t.date, i.issue_date) as date,
          COALESCE(t.description, CONCAT('Invoice ', i.invoice_number)) as description
        FROM financial.invoices i
        LEFT JOIN financial.transactions t ON t.description LIKE CONCAT('%', i.invoice_number, '%')
        WHERE i.client_id = $1
      `;

      const params: any[] = [clientId];
      let paramCount = 2;

      // Add filters
      if (options.startDate) {
        query += ` AND COALESCE(t.date, i.issue_date) >= $${paramCount}`;
        params.push(options.startDate);
        paramCount++;
      }

      if (options.endDate) {
        query += ` AND COALESCE(t.date, i.issue_date) <= $${paramCount}`;
        params.push(options.endDate);
        paramCount++;
      }

      // Add sorting and pagination
      query += ' ORDER BY date DESC';
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }

      const result = await dbClient.query(query, params);

      return result.rows.map(row => ({
        clientId: row.client_id,
        transactionId: row.transaction_id,
        invoiceId: row.invoice_id,
        amount: parseFloat(row.amount),
        type: row.type as any,
        status: row.status as any,
        date: row.date,
        description: row.description
      }));

    } finally {
      dbClient.release();
    }
  }

  /**
   * Delete client (soft delete by setting status to inactive)
   */
  async deleteClient(id: string): Promise<void> {
    const dbClient = await this.database.pool.connect();

    try {
      await dbClient.query('BEGIN');

      // Check if client has invoices
      const invoiceCheck = await dbClient.query(
        'SELECT COUNT(*) FROM financial.invoices WHERE client_id = $1',
        [id]
      );

      if (parseInt(invoiceCheck.rows[0].count) > 0) {
        // Soft delete - just mark as inactive
        await dbClient.query(
          'UPDATE financial.clients SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['inactive', id]
        );
        logger.info(`✅ Client soft deleted (marked inactive): ${id}`);
      } else {
        // Hard delete if no invoices
        await dbClient.query('DELETE FROM financial.clients WHERE id = $1', [id]);
        logger.info(`✅ Client hard deleted: ${id}`);
      }

      await dbClient.query('COMMIT');

    } catch (error: any) {
      await dbClient.query('ROLLBACK');
      logger.error('❌ Error deleting client:', error);
      throw error;
    } finally {
      dbClient.release();
    }
  }

  /**
   * Helper function to map database row to Client object
   */
  private mapRowToClient(row: any): Client {
    return {
      id: row.id,
      name: row.name,
      businessName: row.business_name,
      taxId: row.tax_id,
      taxIdType: row.tax_id_type,
      email: row.email,
      phone: row.phone,
      address: row.address,
      clientType: row.client_type,
      currency: row.currency,
      language: row.language,
      timezone: row.timezone,
      paymentTerms: row.payment_terms,
      paymentMethod: row.payment_method,
      bankAccount: row.bank_account,
      creditLimit: parseFloat(row.credit_limit),
      status: row.status,
      totalRevenue: parseFloat(row.total_revenue),
      totalInvoices: row.total_invoices,
      outstandingBalance: parseFloat(row.outstanding_balance),
      lastInvoiceDate: row.last_invoice_date,
      averageInvoiceAmount: row.average_invoice_amount ? parseFloat(row.average_invoice_amount) : undefined,
      customFields: row.custom_fields,
      tags: row.tags,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      lastContactDate: row.last_contact_date
    };
  }
}