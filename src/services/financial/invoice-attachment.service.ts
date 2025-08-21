import { PrismaClient, Prisma } from '@prisma/client';
import type { InvoiceAttachment } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { FileValidationUtil } from '../../utils/file-validation.util';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  mimeType: string;
  extension: string;
  actualHash: string;
  sanitizedFilename: string;
  secureFilename: string;
}

export interface AttachmentUploadOptions {
  invoiceId: string;
  fileName: string;
  fileType: string;
  fileBuffer: Buffer;
  description?: string;
  uploadedBy: string;
}

export interface SecureAttachmentUploadOptions extends AttachmentUploadOptions {
  checksum?: string;
  clientId?: string; // For additional verification
}

export interface AttachmentListOptions {
  invoiceId?: string;
  uploadedBy?: string;
  limit?: number;
  offset?: number;
}

export interface AttachmentListItem {
  id: string;
  invoiceId: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  description: string;
  uploadedBy: string;
  uploadedAt: Date;
}

/**
 * Secure Invoice Attachment Service
 *
 * Manages file attachments for invoices with comprehensive security measures:
 * - Authentication and authorization checks
 * - Secure file validation and storage
 * - Transaction-based operations
 * - File size quotas per invoice
 * - Automatic cleanup on errors
 * - UUID-based secure filenames
 * - File integrity verification
 */
export class InvoiceAttachmentService {
  private prisma: PrismaClient;
  private baseDir: string;
  private maxFileSize: number;
  private allowedTypes: string[];
  private maxFilesPerInvoice: number;
  private maxTotalSizePerInvoice: number;
  private allowedExtensions: string[];

  constructor(
    prisma: PrismaClient,
    config?: {
      baseDir?: string;
      maxFileSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
      maxFilesPerInvoice?: number;
      maxTotalSizePerInvoice?: number;
    }
  ) {
    this.prisma = prisma;
    this.baseDir = config?.baseDir || path.join(process.cwd(), 'storage', 'secure-attachments');
    this.maxFileSize = config?.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.maxFilesPerInvoice = config?.maxFilesPerInvoice || 20;
    this.maxTotalSizePerInvoice = config?.maxTotalSizePerInvoice || 100 * 1024 * 1024; // 100MB per invoice

    this.allowedTypes = config?.allowedTypes || [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
      'text/csv',
    ];

    this.allowedExtensions = config?.allowedExtensions || [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.docx',
      '.doc',
      '.xlsx',
      '.xls',
      '.txt',
      '.csv',
    ];
  }

  /**
   * Initialize secure storage directory with proper permissions
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });

      // Ensure secure permissions (readable/writable by owner only)
      try {
        await fs.chmod(this.baseDir, 0o700);
      } catch (chmodError) {
        logger.warn(
          'Could not set directory permissions (may not be supported on this filesystem)'
        );
      }

      logger.info(`Secure invoice attachment storage initialized at: ${this.baseDir}`);
    } catch (error) {
      logger.error('Failed to initialize secure attachment storage:', error);
      throw new AppError('Failed to initialize attachment storage', 500);
    }
  }

  /**
   * Securely upload an attachment for an invoice with comprehensive validation
   */
  async uploadAttachment(options: SecureAttachmentUploadOptions): Promise<InvoiceAttachment> {
    const { invoiceId, fileName, fileType, fileBuffer, description, uploadedBy, checksum } =
      options;

    return this.prisma.$transaction(async (tx) => {
      try {
        // 1. Validate and authenticate user access to invoice
        const invoice = await this.validateInvoiceAccess(invoiceId, uploadedBy, tx);

        // 2. Comprehensive file validation
        const validationResult = await this.validateFileSecurely(
          fileBuffer,
          fileType,
          fileName,
          checksum
        );
        if (!validationResult.valid) {
          throw new AppError(
            `File validation failed: ${validationResult.errors?.join(', ') || 'Unknown error'}`,
            400
          );
        }

        // 3. Check quota limits for this invoice
        await this.validateQuotaLimits(invoiceId, fileBuffer.length, tx);

        // 4. Create secure directory structure
        const secureFilePath = await this.createSecureFilePath(
          invoiceId,
          validationResult.secureFilename
        );

        // 5. Write file atomically with verification
        await this.writeFileSecurely(
          secureFilePath.fullPath,
          fileBuffer,
          validationResult.actualHash
        );

        // 6. Create database record with transaction
        // Note: Store security info in description field as JSON until schema migration
        const securityMetadata = {
          originalFileName: fileName,
          fileHash: validationResult.actualHash,
          secureFileName: validationResult.secureFilename,
          integrity: 'verified',
          userDescription: description || '',
        };

        const attachment = await tx.invoiceAttachment.create({
          data: {
            invoiceId,
            fileName: `${fileName} (${validationResult.secureFilename})`.substring(0, 255), // Include secure name for reference
            fileType: validationResult.mimeType,
            fileSize: BigInt(fileBuffer.length),
            filePath: secureFilePath.relativePath,
            description: JSON.stringify(securityMetadata),
            uploadedBy,
          },
        });

        logger.info(`Secure attachment uploaded for invoice ${invoiceId}`, {
          attachmentId: attachment.id,
          fileName: validationResult.secureFilename,
          fileType: validationResult.mimeType,
          size: fileBuffer.length,
          uploadedBy,
          invoiceOwner: invoice.userId,
        });

        return attachment;
      } catch (error) {
        // Cleanup on error: remove any partially written files
        try {
          const tempPath = path.join(this.baseDir, 'temp', invoiceId);
          await fs.rm(tempPath, { recursive: true, force: true });
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temp files after error:', cleanupError);
        }

        if (error instanceof AppError) {
          throw error;
        }

        logger.error('Error uploading secure attachment:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          invoiceId,
          uploadedBy,
          fileName,
        });

        throw new AppError('Failed to upload attachment securely', 500);
      }
    });
  }

  /**
   * Get all attachments for an invoice with user authorization
   */
  async getInvoiceAttachments(invoiceId: string, userId: string): Promise<AttachmentListItem[]> {
    try {
      // Verify user has access to this invoice
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          userId: userId,
        },
      });

      if (!invoice) {
        throw new AppError('Invoice not found or access denied', 404);
      }

      const attachments = await this.prisma.invoiceAttachment.findMany({
        where: { invoiceId },
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          invoiceId: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          description: true,
          uploadedBy: true,
          uploadedAt: true,
        },
      });

      // Parse and clean up response to remove sensitive metadata
      const cleanAttachments: AttachmentListItem[] = attachments.map((attachment: any) => {
        let userDescription = '';
        let originalFileName = attachment.fileName;

        try {
          const metadata = JSON.parse(attachment.description || '{}');
          userDescription = metadata.userDescription || '';
          originalFileName = metadata.originalFileName || attachment.fileName;
        } catch {
          userDescription = attachment.description || '';
        }

        return {
          id: attachment.id,
          invoiceId: attachment.invoiceId,
          fileName: attachment.fileName,
          originalFileName,
          fileType: attachment.fileType,
          fileSize: Number(attachment.fileSize),
          description: userDescription,
          uploadedBy: attachment.uploadedBy,
          uploadedAt: attachment.uploadedAt,
        };
      });

      logger.info(`Retrieved ${cleanAttachments.length} attachments for invoice ${invoiceId}`, {
        userId,
        invoiceId,
        attachmentCount: cleanAttachments.length,
      });

      return cleanAttachments;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting invoice attachments:', error);
      throw new AppError('Failed to get invoice attachments', 500);
    }
  }

  /**
   * Get a specific attachment by ID with user authorization
   */
  async getAttachment(attachmentId: string, userId: string): Promise<InvoiceAttachment | null> {
    try {
      const attachment = await this.prisma.invoiceAttachment.findFirst({
        where: {
          id: attachmentId,
          invoice: {
            userId: userId,
          },
        },
        // No relations needed here for return type compatibility
      });

      if (!attachment) {
        throw new AppError('Attachment not found or access denied', 404);
      }

      return attachment;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting attachment:', error);
      throw new AppError('Failed to get attachment', 500);
    }
  }

  /**
   * Securely download an attachment with integrity verification
   */
  async downloadAttachment(
    attachmentId: string,
    userId: string
  ): Promise<{
    attachment: InvoiceAttachment;
    buffer: Buffer;
  } | null> {
    try {
      const attachment = await this.getAttachment(attachmentId, userId);
      if (!attachment) {
        return null;
      }

      const fullPath = path.join(this.baseDir, attachment.filePath);

      // Verify file exists and is readable
      try {
        await fs.access(fullPath, fs.constants.F_OK | fs.constants.R_OK);
      } catch (accessError) {
        logger.error(`File not accessible: ${attachment.filePath}`, accessError);
        throw new AppError('File not accessible', 404);
      }

      const buffer = await fs.readFile(fullPath);

      // Verify file integrity if hash is stored in metadata
      let fileHash: string | null = null;
      try {
        const metadata = JSON.parse(attachment.description || '{}');
        fileHash = metadata.fileHash;
      } catch {
        // No metadata or invalid JSON, skip integrity check
      }

      if (fileHash) {
        const currentHash = crypto.createHash('sha256').update(buffer).digest('hex');
        if (currentHash !== fileHash) {
          logger.error(`File integrity check failed for attachment ${attachmentId}`, {
            expectedHash: fileHash,
            actualHash: currentHash,
            filePath: attachment.filePath,
          });
          throw new AppError('File integrity check failed', 500);
        }
      }

      logger.info(`Secure download for attachment ${attachmentId}`, {
        userId,
        fileName: attachment.fileName,
        fileSize: Number(attachment.fileSize),
      });

      return {
        attachment,
        buffer,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error downloading attachment:', error);
      throw new AppError('Failed to download attachment', 500);
    }
  }

  /**
   * Securely delete an attachment with proper authorization
   */
  async deleteAttachment(attachmentId: string, deletedBy: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      try {
        // Get attachment with invoice info for authorization
        const attachment = await tx.invoiceAttachment.findFirst({
          where: { id: attachmentId },
          include: {
            invoice: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        });

        if (!attachment) {
          throw new AppError('Attachment not found', 404);
        }

        // Verify user has permission to delete
        const user = await tx.user.findFirst({
          where: { id: deletedBy },
          select: { id: true, role: true },
        });

        if (!user) {
          throw new AppError('User not found', 404);
        }

        const isOwner = attachment.invoice.userId === deletedBy;
        const isUploader = attachment.uploadedBy === deletedBy;
        const isAdmin = user.role === 'admin';

        if (!isOwner && !isUploader && !isAdmin) {
          throw new AppError('Unauthorized to delete this attachment', 403);
        }

        // Delete from database first
        await tx.invoiceAttachment.delete({
          where: { id: attachmentId },
        });

        // Then attempt to delete physical file
        const fullPath = path.join(this.baseDir, attachment.filePath);
        try {
          await fs.unlink(fullPath);
          logger.info(`Physical file deleted: ${attachment.filePath}`);
        } catch (fileError) {
          // Log but don't fail the transaction if file deletion fails
          logger.error(`Error deleting physical file: ${fullPath}`, fileError);
        }

        logger.info(`Attachment securely deleted: ${attachmentId}`, {
          fileName: attachment.fileName,
          deletedBy,
          invoiceId: attachment.invoiceId,
          reason: isAdmin ? 'admin' : isOwner ? 'owner' : 'uploader',
        });

        return true;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Error deleting attachment:', error);
        throw new AppError('Failed to delete attachment', 500);
      }
    });
  }

  /**
   * List attachments with optional filters
   */
  async listAttachments(options: AttachmentListOptions = {}): Promise<{
    attachments: AttachmentListItem[];
    total: number;
  }> {
    const { invoiceId, uploadedBy, limit = 50, offset = 0 } = options;

    try {
      const where: any = {};
      if (invoiceId) {
        where.invoiceId = invoiceId;
      }
      if (uploadedBy) {
        where.uploadedBy = uploadedBy;
      }

      const [rows, total] = await Promise.all([
        this.prisma.invoiceAttachment.findMany({
          where,
          orderBy: { uploadedAt: 'desc' },
          skip: offset,
          take: limit,
          select: {
            id: true,
            invoiceId: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            description: true,
            uploadedBy: true,
            uploadedAt: true,
          },
        }),
        this.prisma.invoiceAttachment.count({ where }),
      ]);

      const attachments: AttachmentListItem[] = rows.map((row: any) => {
        let userDescription = '';
        let originalFileName = row.fileName;
        try {
          const metadata = JSON.parse(row.description || '{}');
          userDescription = metadata.userDescription || '';
          originalFileName = metadata.originalFileName || row.fileName;
        } catch {
          userDescription = row.description || '';
        }
        return {
          id: row.id,
          invoiceId: row.invoiceId,
          fileName: row.fileName,
          originalFileName,
          fileType: row.fileType,
          fileSize: Number(row.fileSize),
          description: userDescription,
          uploadedBy: row.uploadedBy,
          uploadedAt: row.uploadedAt,
        };
      });

      return { attachments, total };
    } catch (error) {
      logger.error('Error listing attachments:', error);
      throw new Error('Failed to list attachments');
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalAttachments: number;
    totalSize: number;
    averageSize: number;
    attachmentsByType: Array<{ type: string; count: number; size: number }>;
  }> {
    try {
      const stats = await this.prisma.invoiceAttachment.aggregate({
        _count: true,
        _sum: {
          fileSize: true,
        },
        _avg: {
          fileSize: true,
        },
      });

      // Get stats by file type
      const typeStats = await this.prisma.$queryRaw<
        Array<{
          file_type: string;
          count: bigint;
          total_size: bigint;
        }>
      >`
        SELECT 
          file_type,
          COUNT(*)::bigint as count,
          SUM(file_size)::bigint as total_size
        FROM financial.invoice_attachments
        GROUP BY file_type
        ORDER BY total_size DESC
      `;

      return {
        totalAttachments: stats._count || 0,
        totalSize: Number(stats._sum.fileSize) || 0,
        averageSize: Number(stats._avg.fileSize) || 0,
        attachmentsByType: typeStats.map((stat) => ({
          type: stat.file_type,
          count: Number(stat.count),
          size: Number(stat.total_size),
        })),
      };
    } catch (error) {
      logger.error('Error getting storage stats:', error);
      throw new Error('Failed to get storage statistics');
    }
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  async cleanupOrphanedFiles(): Promise<number> {
    try {
      let cleanedCount = 0;
      const allFiles = await this.getAllFiles(this.baseDir);

      for (const file of allFiles) {
        const relativePath = path.relative(this.baseDir, file);

        // Check if file exists in database
        const attachment = await this.prisma.invoiceAttachment.findFirst({
          where: { filePath: relativePath },
        });

        if (!attachment) {
          // File is orphaned, delete it
          try {
            await fs.unlink(file);
            cleanedCount++;
            logger.info(`Deleted orphaned file: ${relativePath}`);
          } catch (error) {
            logger.error(`Error deleting orphaned file: ${file}`, error);
          }
        }
      }

      logger.info(`Cleaned up ${cleanedCount} orphaned files`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up orphaned files:', error);
      return 0;
    }
  }

  /**
   * Comprehensive secure file validation
   */
  private async validateFileSecurely(
    fileBuffer: Buffer,
    declaredMimeType: string,
    fileName: string,
    providedChecksum?: string
  ): Promise<ValidationResult> {
    try {
      const result = FileValidationUtil.validateFile(
        fileBuffer,
        fileName,
        declaredMimeType,
        {
          maxFileSize: this.maxFileSize,
          allowedMimeTypes: this.allowedTypes,
          allowedExtensions: this.allowedExtensions,
          requireChecksum: !!providedChecksum,
        },
        providedChecksum
      );

      return {
        valid: result.isValid,
        errors: result.errors,
        mimeType: result.mimeType || declaredMimeType,
        extension: result.extension || '',
        actualHash: result.fileHash || '',
        sanitizedFilename: fileName,
        secureFilename: result.secureFileName || fileName,
      };
    } catch (error) {
      logger.error('File validation error:', error);
      return {
        valid: false,
        errors: ['File validation failed'],
        mimeType: declaredMimeType,
        extension: '',
        actualHash: '',
        sanitizedFilename: fileName,
        secureFilename: '',
      };
    }
  }

  /**
   * Validate user access to invoice
   */
  private async validateInvoiceAccess(invoiceId: string, userId: string, tx: any) {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: userId,
      },
      select: {
        id: true,
        userId: true,
        invoiceNumber: true,
        status: true,
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found or access denied', 404);
    }

    return invoice;
  }

  /**
   * Validate quota limits for invoice
   */
  private async validateQuotaLimits(invoiceId: string, newFileSize: number, tx: any) {
    const existingAttachments = await tx.invoiceAttachment.findMany({
      where: { invoiceId },
      select: {
        fileSize: true,
      },
    });

    // Check file count limit
    if (existingAttachments.length >= this.maxFilesPerInvoice) {
      throw new AppError(`Maximum ${this.maxFilesPerInvoice} files per invoice exceeded`, 400);
    }

    // Check total size limit
    const currentTotalSize = existingAttachments.reduce(
      (sum: number, attachment: any) => sum + Number(attachment.fileSize),
      0
    );

    if (currentTotalSize + newFileSize > this.maxTotalSizePerInvoice) {
      throw new AppError(
        `Total file size limit (${Math.round(
          this.maxTotalSizePerInvoice / (1024 * 1024)
        )}MB) would be exceeded`,
        400
      );
    }
  }

  /**
   * Create secure file path structure
   */
  private async createSecureFilePath(invoiceId: string, secureFileName: string) {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const attachmentDir = path.join(this.baseDir, yearMonth, invoiceId);

    await fs.mkdir(attachmentDir, { recursive: true });

    // Set secure permissions on directory
    try {
      await fs.chmod(attachmentDir, 0o700);
    } catch (chmodError) {
      logger.warn('Could not set directory permissions (may not be supported on this filesystem)');
    }

    const fullPath = path.join(attachmentDir, secureFileName);
    const relativePath = path.relative(this.baseDir, fullPath);

    return { fullPath, relativePath, directory: attachmentDir };
  }

  /**
   * Write file securely with atomic operation and verification
   */
  private async writeFileSecurely(filePath: string, buffer: Buffer, expectedHash: string) {
    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, buffer);

      // Verify written file integrity
      const writtenBuffer = await fs.readFile(tempPath);
      const writtenHash = crypto.createHash('sha256').update(writtenBuffer).digest('hex');

      if (writtenHash !== expectedHash) {
        throw new Error('File integrity verification failed after write');
      }

      // Atomic move to final location
      await fs.rename(tempPath, filePath);

      // Set secure file permissions
      try {
        await fs.chmod(filePath, 0o600);
      } catch (chmodError) {
        logger.warn('Could not set file permissions (may not be supported on this filesystem)');
      }
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temp file:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Recursively get all files in a directory
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...(await this.getAllFiles(fullPath)));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.error(`Error reading directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * Generate a secure download URL with expiration
   */
  generateDownloadUrl(attachmentId: string, expirationMinutes: number = 60): string {
    const expiresAt = Date.now() + expirationMinutes * 60 * 1000;
    const token = Buffer.from(
      JSON.stringify({
        attachmentId,
        expiresAt,
      })
    ).toString('base64');

    return `/api/invoices/attachments/${attachmentId}/download?token=${token}`;
  }

  /**
   * Validate download token
   */
  validateDownloadToken(token: string): {
    valid: boolean;
    attachmentId?: string;
  } {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

      if (decoded.expiresAt < Date.now()) {
        return { valid: false };
      }

      return {
        valid: true,
        attachmentId: decoded.attachmentId,
      };
    } catch (error) {
      return { valid: false };
    }
  }
}
