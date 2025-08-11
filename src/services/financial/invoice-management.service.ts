import { db as DatabaseService } from '../database';
import { Invoice, InvoiceModel, InvoiceItem } from '../../models/financial/invoice.model';
import { logger } from '../../utils/log';
import { auditCatch } from '../../utils/forensic-logger';

export class InvoiceManagementService {
  private database: typeof DatabaseService;

  constructor() {
    this.database = DatabaseService;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
    const invoice = new InvoiceModel(invoiceData);
    const dbClient = await this.database.pool.connect();

    try {
      await dbClient.query('BEGIN');

      // Verify client exists
      const clientCheck = await dbClient.query(
        'SELECT id, name, tax_id, address FROM financial.clients WHERE id = $1',
        [invoice.clientId]
      );

      if (clientCheck.rows.length === 0) {
        throw new Error(`Client with ID ${invoice.clientId} not found`);
      }

      const client = clientCheck.rows[0];

      // Generate invoice number if not provided
      if (!invoice.invoiceNumber) {
        const numberResult = await dbClient.query(
          'SELECT financial.generate_invoice_number($1, $2)',
          ['INV', new Date().getFullYear()]
        );
        invoice.invoiceNumber = numberResult.rows[0].generate_invoice_number;
      }

      // Set client data from database
      invoice.clientName = client.name;
      invoice.clientTaxId = client.tax_id;
      invoice.clientAddress = client.address;

      // Calculate totals
      invoice.calculateTotals();

      // Insert new invoice
      const query = `
        INSERT INTO financial.invoices (
          id, invoice_number, client_id, client_name, client_tax_id, client_address,
          type, status, issue_date, due_date, service_start_date, service_end_date,
          currency, exchange_rate, items, subtotal, tax_amount, tax_rate, tax_type,
          discount, discount_type, total, payment_method, payment_terms, bank_account,
          related_documents, related_transaction_ids, notes, terms_and_conditions,
          custom_fields, tags, created_by, is_deductible, deductible_category, deductible_percentage
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35
        ) RETURNING *`;

      const values = [
        invoice.id, invoice.invoiceNumber, invoice.clientId, invoice.clientName,
        invoice.clientTaxId, JSON.stringify(invoice.clientAddress),
        invoice.type, invoice.status, invoice.issueDate, invoice.dueDate,
        invoice.serviceStartDate, invoice.serviceEndDate, invoice.currency,
        invoice.exchangeRate, JSON.stringify(invoice.items), invoice.subtotal,
        invoice.taxAmount, invoice.taxRate, invoice.taxType, invoice.discount,
        invoice.discountType, invoice.total, invoice.paymentMethod, invoice.paymentTerms,
        invoice.bankAccount, JSON.stringify(invoice.relatedDocuments),
        invoice.relatedTransactionIds, invoice.notes, invoice.termsAndConditions,
        JSON.stringify(invoice.customFields), invoice.tags, invoice.createdBy,
        invoice.isDeductible, invoice.deductibleCategory, invoice.deductiblePercentage
      ];

      const result = await dbClient.query(query, values);
      await dbClient.query('COMMIT');

      logger.info(`✅ Invoice created: ${invoice.invoiceNumber} for client ${invoice.clientName}`);
      return this.mapRowToInvoice(result.rows[0]);

    } catch (error: any) {
      await dbClient.query('ROLLBACK');
      logger.error('❌ Error creating invoice:', error);
      auditCatch('InvoiceManagementService.createInvoice', error, 'logged');
      throw error;
    } finally {
      dbClient.release();
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(id: string): Promise<Invoice | null> {
    const dbClient = await this.database.pool.connect();

    try {
      const result = await dbClient.query(
        'SELECT * FROM financial.invoices WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToInvoice(result.rows[0]);
    } finally {
      dbClient.release();
    }
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    const dbClient = await this.database.pool.connect();

    try {
      const result = await dbClient.query(
        'SELECT * FROM financial.invoices WHERE invoice_number = $1',
        [invoiceNumber]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToInvoice(result.rows[0]);
    } finally {
      dbClient.release();
    }
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const dbClient = await this.database.pool.connect();

    try {
      await dbClient.query('BEGIN');

      // Get current invoice
      const currentInvoice = await this.getInvoice(id);
      if (!currentInvoice) {
        throw new Error('Invoice not found');
      }

      // Prevent updates to paid invoices (except status changes)
      if (currentInvoice.status === 'paid' && updates.status !== 'refunded') {
        const allowedFields = ['status', 'paid_date', 'payment_reference', 'notes'];
        const hasRestrictedUpdates = Object.keys(updates).some(
          key => !allowedFields.includes(key.replace(/([A-Z])/g, '_$1').toLowerCase())
        );

        if (hasRestrictedUpdates) {
          throw new Error('Cannot modify paid invoices except for status, payment info, and notes');
        }
      }

      // Recalculate totals if items changed
      if (updates.items) {
        const tempInvoice = new InvoiceModel({ ...currentInvoice, ...updates });
        tempInvoice.calculateTotals();
        updates.subtotal = tempInvoice.subtotal;
        updates.taxAmount = tempInvoice.taxAmount;
        updates.total = tempInvoice.total;
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const allowedFields = [
        'status', 'due_date', 'paid_date', 'service_start_date', 'service_end_date',
        'currency', 'exchange_rate', 'items', 'subtotal', 'tax_amount', 'tax_rate',
        'tax_type', 'discount', 'discount_type', 'total', 'payment_method',
        'payment_terms', 'bank_account', 'payment_reference', 'related_documents',
        'related_transaction_ids', 'notes', 'terms_and_conditions', 'custom_fields',
        'tags', 'sent_at', 'viewed_at', 'attachments', 'pdf_url', 'is_deductible',
        'deductible_category', 'deductible_percentage'
      ];

      for (const field of allowedFields) {
        const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        if (updates[camelField as keyof Invoice] !== undefined) {
          updateFields.push(`${field} = $${paramCount}`);

          // Handle JSON fields
          if (['items', 'related_documents', 'custom_fields', 'attachments'].includes(field)) {
            values.push(JSON.stringify(updates[camelField as keyof Invoice]));
          } else {
            values.push(updates[camelField as keyof Invoice]);
          }

          paramCount++;
        }
      }

      if (updateFields.length === 0) {
        return currentInvoice;
      }

      // Add updated_at
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      // Handle status-specific updates
      if (updates.status === 'sent' && !currentInvoice.sentAt) {
        updateFields.push('sent_at = CURRENT_TIMESTAMP');
      } else if (updates.status === 'viewed' && !currentInvoice.viewedAt) {
        updateFields.push('viewed_at = CURRENT_TIMESTAMP');
      } else if (updates.status === 'paid' && !currentInvoice.paidDate) {
        updateFields.push('paid_date = CURRENT_DATE');
      }

      // Execute update
      const query = `
        UPDATE financial.invoices 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *`;

      values.push(id);
      const result = await dbClient.query(query, values);
      await dbClient.query('COMMIT');

      logger.info(`✅ Invoice updated: ${id} (${currentInvoice.invoiceNumber})`);
      return this.mapRowToInvoice(result.rows[0]);

    } catch (error: any) {
      await dbClient.query('ROLLBACK');
      logger.error('❌ Error updating invoice:', error);
      throw error;
    } finally {
      dbClient.release();
    }
  }

  /**
   * List invoices with filters
   */
  async listInvoices(options: {
    clientId?: string;
    status?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<{ invoices: Invoice[]; total: number }> {
    const dbClient = await this.database.pool.connect();

    try {
      let query = 'SELECT * FROM financial.invoices WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) FROM financial.invoices WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      // Add filters
      if (options.clientId) {
        query += ` AND client_id = $${paramCount}`;
        countQuery += ` AND client_id = $${paramCount}`;
        params.push(options.clientId);
        paramCount++;
      }

      if (options.status) {
        query += ` AND status = $${paramCount}`;
        countQuery += ` AND status = $${paramCount}`;
        params.push(options.status);
        paramCount++;
      }

      if (options.type) {
        query += ` AND type = $${paramCount}`;
        countQuery += ` AND type = $${paramCount}`;
        params.push(options.type);
        paramCount++;
      }

      if (options.startDate) {
        query += ` AND issue_date >= $${paramCount}`;
        countQuery += ` AND issue_date >= $${paramCount}`;
        params.push(options.startDate);
        paramCount++;
      }

      if (options.endDate) {
        query += ` AND issue_date <= $${paramCount}`;
        countQuery += ` AND issue_date <= $${paramCount}`;
        params.push(options.endDate);
        paramCount++;
      }

      if (options.search) {
        query += ` AND (
          LOWER(invoice_number) LIKE LOWER($${paramCount}) OR
          LOWER(client_name) LIKE LOWER($${paramCount}) OR
          LOWER(notes) LIKE LOWER($${paramCount})
        )`;
        countQuery += ` AND (
          LOWER(invoice_number) LIKE LOWER($${paramCount}) OR
          LOWER(client_name) LIKE LOWER($${paramCount}) OR
          LOWER(notes) LIKE LOWER($${paramCount})
        )`;
        params.push(`%${options.search}%`);
        paramCount++;
      }

      // Get total count
      const countResult = await dbClient.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add sorting
      const sortBy = options.sortBy || 'issue_date';
      const sortOrder = options.sortOrder || 'DESC';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Add pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      // Execute query
      const result = await dbClient.query(query, params);
      const invoices = result.rows.map(row => this.mapRowToInvoice(row));

      return { invoices, total };

    } finally {
      dbClient.release();
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(): Promise<Invoice[]> {
    const dbClient = await this.database.pool.connect();

    try {
      const query = `
        SELECT * FROM financial.invoices 
        WHERE status IN ('sent', 'viewed') 
          AND due_date < CURRENT_DATE
        ORDER BY due_date ASC`;

      const result = await dbClient.query(query);
      return result.rows.map(row => this.mapRowToInvoice(row));

    } finally {
      dbClient.release();
    }
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(id: string, paidDate?: Date, paymentReference?: string): Promise<Invoice> {
    return this.updateInvoice(id, {
      status: 'paid',
      paidDate: paidDate || new Date(),
      paymentReference
    });
  }

  /**
   * Add item to invoice
   */
  async addItem(invoiceId: string, item: InvoiceItem): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot modify paid invoices');
    }

    const updatedItems = [...invoice.items, item];
    return this.updateInvoice(invoiceId, { items: updatedItems });
  }

  /**
   * Attach document to invoice
   */
  async attachDocument(invoiceId: string, document: {
    type: 'fiscal_invoice' | 'receipt' | 'contract' | 'delivery_note' | 'other';
    documentId: string;
    fileName?: string;
    description?: string;
  }): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const relatedDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: document.type,
      documentId: document.documentId,
      fileName: document.fileName,
      description: document.description,
      uploadedAt: new Date()
    };

    const updatedDocuments = [...(invoice.relatedDocuments || []), relatedDocument];
    return this.updateInvoice(invoiceId, { relatedDocuments: updatedDocuments });
  }

  /**
   * Get invoice statistics for a client
   */
  async getClientInvoiceStats(clientId: string): Promise<{
    totalInvoices: number;
    totalRevenue: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    averageAmount: number;
    lastInvoiceDate?: Date;
  }> {
    const dbClient = await this.database.pool.connect();

    try {
      const query = `
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_revenue,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status IN ('sent', 'viewed') THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status IN ('sent', 'viewed') AND due_date < CURRENT_DATE THEN 1 END) as overdue_invoices,
          AVG(total) as average_amount,
          MAX(issue_date) as last_invoice_date
        FROM financial.invoices 
        WHERE client_id = $1 AND status != 'cancelled'`;

      const result = await dbClient.query(query, [clientId]);
      const row = result.rows[0];

      return {
        totalInvoices: parseInt(row.total_invoices),
        totalRevenue: parseFloat(row.total_revenue),
        paidInvoices: parseInt(row.paid_invoices),
        pendingInvoices: parseInt(row.pending_invoices),
        overdueInvoices: parseInt(row.overdue_invoices),
        averageAmount: parseFloat(row.average_amount) || 0,
        lastInvoiceDate: row.last_invoice_date
      };

    } finally {
      dbClient.release();
    }
  }

  /**
   * Delete invoice (soft delete by marking as cancelled)
   */
  async deleteInvoice(id: string): Promise<void> {
    const invoice = await this.getInvoice(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot delete paid invoices');
    }

    await this.updateInvoice(id, { status: 'cancelled' });
    logger.info(`✅ Invoice cancelled: ${id} (${invoice.invoiceNumber})`);
  }

  /**
   * Helper function to map database row to Invoice object
   */
  private mapRowToInvoice(row: any): Invoice {
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      clientId: row.client_id,
      clientName: row.client_name,
      clientTaxId: row.client_tax_id,
      clientAddress: row.client_address,
      type: row.type,
      status: row.status,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      paidDate: row.paid_date,
      serviceStartDate: row.service_start_date,
      serviceEndDate: row.service_end_date,
      currency: row.currency,
      exchangeRate: row.exchange_rate ? parseFloat(row.exchange_rate) : undefined,
      items: row.items || [],
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.tax_amount),
      taxRate: parseFloat(row.tax_rate),
      taxType: row.tax_type,
      discount: row.discount ? parseFloat(row.discount) : undefined,
      discountType: row.discount_type,
      total: parseFloat(row.total),
      paymentMethod: row.payment_method,
      paymentTerms: row.payment_terms,
      bankAccount: row.bank_account,
      paymentReference: row.payment_reference,
      relatedDocuments: row.related_documents || [],
      relatedTransactionIds: row.related_transaction_ids || [],
      notes: row.notes,
      termsAndConditions: row.terms_and_conditions,
      customFields: row.custom_fields || {},
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sentAt: row.sent_at,
      viewedAt: row.viewed_at,
      createdBy: row.created_by,
      attachments: row.attachments || [],
      pdfUrl: row.pdf_url,
      isDeductible: row.is_deductible,
      deductibleCategory: row.deductible_category,
      deductiblePercentage: row.deductible_percentage ? parseFloat(row.deductible_percentage) : undefined
    };
  }
}