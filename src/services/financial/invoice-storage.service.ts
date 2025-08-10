import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

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

/**
 * Invoice Storage Service - Prisma Implementation
 *
 * Manages physical storage of invoice PDF files and their metadata.
 * Supports local filesystem storage with metadata tracked in database.
 */
export class InvoiceStoragePrismaService {
  private prisma: PrismaClient;
  private baseDir: string;
  private publicBaseUrl?: string;

  constructor(
    prisma: PrismaClient,
    config?: {
      baseDir?: string;
      publicBaseUrl?: string;
    }
  ) {
    this.prisma = prisma;
    this.baseDir = config?.baseDir || path.join(process.cwd(), 'storage', 'invoices');
    this.publicBaseUrl = config?.publicBaseUrl;
  }

  /**
   * Store an invoice PDF file with metadata
   */
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

      // Generate unique filename to avoid collisions
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
      let expires_at: Date | undefined;
      if (expirationDays) {
        expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + expirationDays);
      }

      // Store metadata in database using Prisma
      const stored_invoices = await this.prisma.stored_invoices.create({
        data: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          file_name: uniqueFileName,
          file_path: relativePath,
          file_size: fileSize,
          mime_type: 'application/pdf',
          storage_type: storageType,
          url,
          expires_at: expires_at,
          metadata: {}
        }
      });

      logger.info(`Invoice stored successfully: ${uniqueFileName}`);

      return {
        id: stored_invoices.id,
        invoiceId: stored_invoices.invoice_id,
        invoiceNumber: stored_invoices.invoice_number,
        fileName: stored_invoices.file_name,
        filePath: stored_invoices.file_path,
        fileSize: Number(stored_invoices.file_size),
        mimeType: stored_invoices.mime_type,
        storageType: stored_invoices.storage_type as 'local' | 's3' | 'gcs',
        url: stored_invoices.url || undefined,
        metadata: stored_invoices.metadata as Record<string, any> | undefined,
        createdAt: stored_invoices.created_at || new Date(),
        expiresAt: stored_invoices.expires_at || undefined
      };

    } catch (error) {
      logger.error('Error storing invoice:', error);
      throw new Error(`Failed to store invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve an invoice by ID
   */
  async retrieveInvoice(invoiceId: string): Promise<{
    metadata: StoredInvoice;
    buffer: Buffer;
  } | null> {
    try {
      // Get metadata from database
      const stored_invoices = await this.prisma.stored_invoices.findFirst({
        where: {
          invoice_id: invoiceId
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      if (!stored_invoices) {
        return null;
      }

      // Check if expired
      if (stored_invoices.expires_at && new Date(stored_invoices.expires_at) < new Date()) {
        logger.warn(`Invoice ${invoiceId} has expired`);
        return null;
      }

      // Read file
      const fullPath = path.join(this.baseDir, stored_invoices.file_path);
      const buffer = await fs.readFile(fullPath);

      const metadata: StoredInvoice = {
        id: stored_invoices.id,
        invoiceId: stored_invoices.invoice_id,
        invoiceNumber: stored_invoices.invoice_number,
        fileName: stored_invoices.file_name,
        filePath: stored_invoices.file_path,
        fileSize: Number(stored_invoices.file_size),
        mimeType: stored_invoices.mime_type,
        storageType: stored_invoices.storage_type as 'local' | 's3' | 'gcs',
        url: stored_invoices.url || undefined,
        metadata: stored_invoices.metadata as Record<string, any> | undefined,
        createdAt: stored_invoices.created_at || new Date(),
        expiresAt: stored_invoices.expires_at || undefined
      };

      return {
        metadata,
        buffer
      };

    } catch (error) {
      logger.error('Error retrieving invoice:', error);
      return null;
    }
  }

  /**
   * Retrieve an invoice by invoice number
   */
  async retrieveByInvoiceNumber(invoiceNumber: string): Promise<{
    metadata: StoredInvoice;
    buffer: Buffer;
  } | null> {
    try {
      const stored_invoices = await this.prisma.stored_invoices.findFirst({
        where: {
          invoice_number: invoiceNumber
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      if (!stored_invoices) {
        return null;
      }

      const fullPath = path.join(this.baseDir, stored_invoices.file_path);
      const buffer = await fs.readFile(fullPath);

      const metadata: StoredInvoice = {
        id: stored_invoices.id,
        invoiceId: stored_invoices.invoice_id,
        invoiceNumber: stored_invoices.invoice_number,
        fileName: stored_invoices.file_name,
        filePath: stored_invoices.file_path,
        fileSize: Number(stored_invoices.file_size),
        mimeType: stored_invoices.mime_type,
        storageType: stored_invoices.storage_type as 'local' | 's3' | 'gcs',
        url: stored_invoices.url || undefined,
        metadata: stored_invoices.metadata as Record<string, any> | undefined,
        createdAt: stored_invoices.created_at || new Date(),
        expiresAt: stored_invoices.expires_at || undefined
      };

      return {
        metadata,
        buffer
      };

    } catch (error) {
      logger.error('Error retrieving invoice by number:', error);
      return null;
    }
  }

  /**
   * List stored invoices with optional filters
   */
  async listInvoices(filters?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<StoredInvoice[]> {
    try {
      const where: any = {};

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      const stored_invoices = await this.prisma.stored_invoices.findMany({
        where,
        orderBy: {
          created_at: 'desc'
        },
        skip: filters?.offset,
        take: filters?.limit
      });

      return stored_invoices.map((invoice: any) => ({
        id: invoice.id,
        invoiceId: invoice.invoice_id,
        invoiceNumber: invoice.invoice_number,
        fileName: invoice.file_name,
        filePath: invoice.file_path,
        fileSize: Number(invoice.file_size),
        mimeType: invoice.mime_type,
        storageType: invoice.storage_type as 'local' | 's3' | 'gcs',
        url: invoice.url || undefined,
        metadata: invoice.metadata as Record<string, any> | undefined,
        createdAt: invoice.created_at || new Date(),
        expiresAt: invoice.expires_at || undefined
      }));

    } catch (error) {
      logger.error('Error listing invoices:', error);
      throw new Error('Failed to list invoices');
    }
  }

  /**
   * Delete an invoice and its physical file
   */
  async deleteInvoice(invoiceId: string): Promise<boolean> {
    try {
      // Get file info first
      const invoice = await this.retrieveInvoice(invoiceId);
      if (!invoice) {
        return false;
      }

      // Delete physical file
      const fullPath = path.join(this.baseDir, invoice.metadata.filePath);
      try {
        await fs.unlink(fullPath);
      } catch (error) {
        logger.error(`Error deleting physical file: ${fullPath}`, error);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      await this.prisma.stored_invoices.deleteMany({
        where: {
          invoice_id: invoiceId
        }
      });

      logger.info(`Invoice deleted: ${invoiceId}`);
      return true;

    } catch (error) {
      logger.error('Error deleting invoice:', error);
      return false;
    }
  }

  /**
   * Clean up expired invoices
   */
  async cleanupExpiredInvoices(): Promise<number> {
    try {
      // Get expired invoices
      const expiredInvoices = await this.prisma.stored_invoices.findMany({
        where: {
          expires_at: {
            not: null,
            lt: new Date()
          }
        }
      });

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
        await this.prisma.stored_invoices.deleteMany({
          where: {
            expires_at: {
              not: null,
              lt: new Date()
            }
          }
        });
      }

      logger.info(`Cleaned up ${deletedCount} expired invoices`);
      return deletedCount;

    } catch (error) {
      logger.error('Error cleaning up expired invoices:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(): Promise<{
    totalInvoices: number;
    totalSize: number;
    averageSize: number;
    oldestInvoice?: Date;
    newestInvoice?: Date;
    invoicesByMonth: { month: string; count: number }[];
  }> {
    try {
      // Get aggregate statistics
      const aggregateStats = await this.prisma.stored_invoices.aggregate({
        _count: true,
        _sum: {
          file_size: true
        },
        _avg: {
          file_size: true
        },
        _min: {
          created_at: true
        },
        _max: {
          created_at: true
        }
      });

      // Get monthly statistics using raw query
      const monthlyStats = await this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT 
          TO_CHAR(createdAt, 'YYYY-MM') as month,
          COUNT(*)::bigint as count
        FROM financial."StoredInvoice"
        WHERE createdAt >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(createdAt, 'YYYY-MM')
        ORDER BY month DESC
      `;

      return {
        totalInvoices: typeof aggregateStats._count === 'number' ? aggregateStats._count : 0,
        totalSize: Number(aggregateStats._sum?.file_size) || 0,
        averageSize: Number(aggregateStats._avg?.file_size) || 0,
        oldestInvoice: aggregateStats._min?.created_at || undefined,
        newestInvoice: aggregateStats._max?.created_at || undefined,
        invoicesByMonth: monthlyStats.map(stat => ({
          month: stat.month,
          count: Number(stat.count)
        }))
      };

    } catch (error) {
      logger.error('Error getting storage statistics:', error);
      throw new Error('Failed to get storage statistics');
    }
  }

  /**
   * Generate a temporary download link
   */
  async generateTemporaryLink(
    invoiceId: string,
    expirationMinutes: number = 60
  ): Promise<{
    url: string;
    token: string;
    expires_at: Date;
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

      // Store token in database
      // TODO: invoiceDownloadToken table needs to be created
      /*
      await this.prisma.invoiceDownloadToken.create({
        data: {
          token,
          invoice_id: invoiceId,
          expires_at: expiresAt
        }
      });
      */

      // Generate URL
      const url = `${this.publicBaseUrl}/invoices/download/${token}`;

      return {
        url,
        token,
        expires_at: expiresAt
      };

    } catch (error) {
      logger.error('Error generating temporary link:', error);
      return null;
    }
  }

  /**
   * Update invoice metadata
   */
  async updateMetadata(
    invoiceId: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    try {
      const result = await this.prisma.stored_invoices.updateMany({
        where: {
          invoice_id: invoiceId
        },
        data: {
          metadata
        }
      });

      return result.count > 0;

    } catch (error) {
      logger.error('Error updating invoice metadata:', error);
      return false;
    }
  }

  /**
   * Get storage usage by client
   */
  async getStorageByClient(): Promise<Array<{
    clientId: string;
    clientName: string;
    invoiceCount: number;
    totalSize: number;
  }>> {
    try {
      const results = await this.prisma.$queryRaw<Array<{
        client_id: string;
        client_name: string;
        invoice_count: bigint;
        total_size: bigint;
      }>>`
        SELECT 
          i.client_id,
          c.name as client_name,
          COUNT(si.id)::bigint as invoice_count,
          COALESCE(SUM(si.fileSize), 0)::bigint as total_size
        FROM financial.invoices i
        JOIN financial.clients c ON i.client_id = c.id
        LEFT JOIN financial."StoredInvoice" si ON i.invoiceNumber = si.invoiceNumber
        GROUP BY i.client_id, c.name
        ORDER BY total_size DESC
      `;

      return results.map(result => ({
        clientId: result.client_id,
        clientName: result.client_name,
        invoiceCount: Number(result.invoice_count),
        totalSize: Number(result.total_size)
      }));

    } catch (error) {
      logger.error('Error getting storage by client:', error);
      throw new Error('Failed to get storage by client');
    }
  }
}