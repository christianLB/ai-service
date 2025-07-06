import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/log';

export interface StoredInvoice {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  storageType: 'local' | 's3' | 'gcs';
  url?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface InvoiceStorageOptions {
  storageType?: 'local' | 's3' | 'gcs';
  expirationDays?: number;
  generatePublicUrl?: boolean;
}

export class InvoiceStorageService {
  private pool: Pool;
  private baseDir: string;
  private publicBaseUrl?: string;

  constructor(pool: Pool, config?: {
    baseDir?: string;
    publicBaseUrl?: string;
  }) {
    this.pool = pool;
    this.baseDir = config?.baseDir || path.join(process.cwd(), 'storage', 'invoices');
    this.publicBaseUrl = config?.publicBaseUrl;
  }

  async initializeSchema(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS stored_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id VARCHAR(255) NOT NULL,
        invoice_number VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
        storage_type VARCHAR(20) NOT NULL DEFAULT 'local',
        url TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(invoice_id, file_name)
      );

      CREATE INDEX IF NOT EXISTS idx_stored_invoices_invoice_id ON stored_invoices(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_stored_invoices_invoice_number ON stored_invoices(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_stored_invoices_created_at ON stored_invoices(created_at);
      CREATE INDEX IF NOT EXISTS idx_stored_invoices_expires_at ON stored_invoices(expires_at);
    `;

    try {
      await this.pool.query(createTableQuery);
      logger.info('Stored invoices table initialized');
    } catch (error) {
      logger.error('Error initializing invoice storage schema:', error);
      throw error;
    }
  }

  async storeInvoice(
    invoiceId: string,
    invoiceNumber: string,
    pdfBuffer: Buffer,
    fileName: string,
    options: InvoiceStorageOptions = {}
  ): Promise<StoredInvoice> {
    const {
      storageType = 'local',
      expirationDays,
      generatePublicUrl = false
    } = options;

    try {
      // Ensure storage directory exists
      const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const storageDir = path.join(this.baseDir, yearMonth);
      await fs.mkdir(storageDir, { recursive: true });

      // Generate unique filename
      const uniqueFileName = `${invoiceNumber}_${Date.now()}_${fileName}`;
      const filePath = path.join(storageDir, uniqueFileName);
      const relativePath = path.relative(this.baseDir, filePath);

      // Store file locally
      await fs.writeFile(filePath, pdfBuffer);

      // Get file size
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Generate URL if requested
      let url: string | undefined;
      if (generatePublicUrl && this.publicBaseUrl) {
        url = `${this.publicBaseUrl}/invoices/${relativePath}`;
      }

      // Calculate expiration date
      let expiresAt: Date | undefined;
      if (expirationDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expirationDays);
      }

      // Store metadata in database
      const insertQuery = `
        INSERT INTO stored_invoices 
        (invoice_id, invoice_number, file_name, file_path, file_size, mime_type, storage_type, url, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await this.pool.query(insertQuery, [
        invoiceId,
        invoiceNumber,
        uniqueFileName,
        relativePath,
        fileSize,
        'application/pdf',
        storageType,
        url,
        expiresAt
      ]);

      logger.info(`Invoice stored successfully: ${uniqueFileName}`);
      return result.rows[0];

    } catch (error) {
      logger.error('Error storing invoice:', error);
      throw new Error(`Failed to store invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retrieveInvoice(invoiceId: string): Promise<{
    metadata: StoredInvoice;
    buffer: Buffer;
  } | null> {
    try {
      // Get metadata from database
      const query = `
        SELECT * FROM stored_invoices 
        WHERE invoice_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const result = await this.pool.query(query, [invoiceId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const metadata = result.rows[0];

      // Check if expired
      if (metadata.expires_at && new Date(metadata.expires_at) < new Date()) {
        logger.warn(`Invoice ${invoiceId} has expired`);
        return null;
      }

      // Read file
      const fullPath = path.join(this.baseDir, metadata.file_path);
      const buffer = await fs.readFile(fullPath);

      return {
        metadata,
        buffer
      };

    } catch (error) {
      logger.error('Error retrieving invoice:', error);
      return null;
    }
  }

  async retrieveByInvoiceNumber(invoiceNumber: string): Promise<{
    metadata: StoredInvoice;
    buffer: Buffer;
  } | null> {
    try {
      const query = `
        SELECT * FROM stored_invoices 
        WHERE invoice_number = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const result = await this.pool.query(query, [invoiceNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const metadata = result.rows[0];
      const fullPath = path.join(this.baseDir, metadata.file_path);
      const buffer = await fs.readFile(fullPath);

      return {
        metadata,
        buffer
      };

    } catch (error) {
      logger.error('Error retrieving invoice by number:', error);
      return null;
    }
  }

  async listInvoices(filters?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<StoredInvoice[]> {
    let query = 'SELECT * FROM stored_invoices WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async deleteInvoice(invoiceId: string): Promise<boolean> {
    try {
      // Get file info first
      const invoice = await this.retrieveInvoice(invoiceId);
      if (!invoice) {
        return false;
      }

      // Delete physical file
      const fullPath = path.join(this.baseDir, invoice.metadata.filePath);
      await fs.unlink(fullPath);

      // Delete from database
      const deleteQuery = 'DELETE FROM stored_invoices WHERE invoice_id = $1';
      await this.pool.query(deleteQuery, [invoiceId]);

      logger.info(`Invoice deleted: ${invoiceId}`);
      return true;

    } catch (error) {
      logger.error('Error deleting invoice:', error);
      return false;
    }
  }

  async cleanupExpiredInvoices(): Promise<number> {
    try {
      // Get expired invoices
      const selectQuery = `
        SELECT * FROM stored_invoices 
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
      `;

      const result = await this.pool.query(selectQuery);
      const expiredInvoices = result.rows;

      let deletedCount = 0;

      for (const invoice of expiredInvoices) {
        try {
          // Delete physical file
          const fullPath = path.join(this.baseDir, invoice.file_path);
          await fs.unlink(fullPath);
          deletedCount++;
        } catch (error) {
          logger.error(`Error deleting file ${invoice.file_path}:`, error);
        }
      }

      // Delete from database
      if (expiredInvoices.length > 0) {
        const deleteQuery = `
          DELETE FROM stored_invoices 
          WHERE expires_at IS NOT NULL AND expires_at < NOW()
        `;
        await this.pool.query(deleteQuery);
      }

      logger.info(`Cleaned up ${deletedCount} expired invoices`);
      return deletedCount;

    } catch (error) {
      logger.error('Error cleaning up expired invoices:', error);
      return 0;
    }
  }

  async getStorageStatistics(): Promise<{
    totalInvoices: number;
    totalSize: number;
    averageSize: number;
    oldestInvoice?: Date;
    newestInvoice?: Date;
    invoicesByMonth: { month: string; count: number }[];
  }> {
    const statsQuery = `
      WITH invoice_stats AS (
        SELECT 
          COUNT(*) as total_invoices,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM stored_invoices
      ),
      monthly_stats AS (
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM stored_invoices
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month DESC
      )
      SELECT 
        (SELECT total_invoices FROM invoice_stats) as total_invoices,
        (SELECT total_size FROM invoice_stats) as total_size,
        (SELECT avg_size FROM invoice_stats) as avg_size,
        (SELECT oldest FROM invoice_stats) as oldest,
        (SELECT newest FROM invoice_stats) as newest,
        (SELECT json_agg(json_build_object('month', month, 'count', count)) FROM monthly_stats) as monthly
    `;

    const result = await this.pool.query(statsQuery);
    const row = result.rows[0];

    return {
      totalInvoices: parseInt(row.total_invoices) || 0,
      totalSize: parseInt(row.total_size) || 0,
      averageSize: parseFloat(row.avg_size) || 0,
      oldestInvoice: row.oldest,
      newestInvoice: row.newest,
      invoicesByMonth: row.monthly || []
    };
  }

  // Generate a temporary download link
  async generateTemporaryLink(
    invoiceId: string, 
    expirationMinutes: number = 60
  ): Promise<{
    url: string;
    token: string;
    expiresAt: Date;
  } | null> {
    try {
      const invoice = await this.retrieveInvoice(invoiceId);
      if (!invoice) {
        return null;
      }

      // Generate a secure token
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

      // Store token in database (you might want a separate table for this)
      const insertQuery = `
        INSERT INTO invoice_download_tokens 
        (token, invoice_id, expires_at)
        VALUES ($1, $2, $3)
      `;

      await this.pool.query(insertQuery, [token, invoiceId, expiresAt]);

      // Generate URL
      const url = `${this.publicBaseUrl}/invoices/download/${token}`;

      return {
        url,
        token,
        expiresAt
      };

    } catch (error) {
      logger.error('Error generating temporary link:', error);
      return null;
    }
  }
}