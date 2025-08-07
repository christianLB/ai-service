import { InvoiceAttachmentService } from '../invoice-attachment.service';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../../utils/errors';
import path from 'path';
import { promises as fs } from 'fs';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    chmod: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    rename: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    rm: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../../utils/file-validation', () => ({
  validateInvoiceAttachment: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const { logger } = require('../../../utils/logger');
const { FileValidationUtil } = require('../../../utils/file-validation.util');

describe('InvoiceAttachmentService', () => {
  let service: InvoiceAttachmentService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Prisma client
    mockPrisma = {
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      invoice: {
        findFirst: jest.fn()
      },
      invoiceAttachment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn()
      },
      user: {
        findUnique: jest.fn()
      },
      $queryRaw: jest.fn()
    };

    service = new InvoiceAttachmentService(mockPrisma, {
      baseDir: '/test/storage',
      maxFileSize: 10 * 1024 * 1024,
      maxFilesPerInvoice: 5,
      maxTotalSizePerInvoice: 50 * 1024 * 1024
    });
  });

  describe('uploadAttachment', () => {
    const mockUploadOptions = {
      invoiceId: 'test-invoice-id',
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileBuffer: Buffer.from('test content'),
      description: 'Test description',
      uploadedBy: 'test-user-id'
    };

    it('should successfully upload a valid attachment', async () => {
      // Mock successful validation
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        valid: true,
        actualHash: 'test-hash',
        secureFilename: 'secure-test.pdf',
        mimeType: 'application/pdf'
      });

      // Mock invoice access check
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'test-invoice-id',
        userId: 'test-user-id'
      });

      // Mock quota check
      mockPrisma.invoiceAttachment.findMany.mockResolvedValue([]);

      // Mock file write
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test content'));

      // Mock attachment creation
      mockPrisma.invoiceAttachment.create.mockResolvedValue({
        id: 'attachment-id',
        invoiceId: 'test-invoice-id',
        fileName: 'test.pdf (secure-test.pdf)',
        fileType: 'application/pdf',
        fileSize: BigInt(12),
        filePath: '2024-01/test-invoice-id/secure-test.pdf',
        uploadedAt: new Date()
      });

      const result = await service.uploadAttachment(mockUploadOptions);

      expect(result).toBeDefined();
      expect(result.id).toBe('attachment-id');
      expect(FileValidationUtil.validateFile).toHaveBeenCalledWith(
        mockUploadOptions.fileBuffer,
        mockUploadOptions.fileName,
        mockUploadOptions.fileType,
        expect.any(Object),
        undefined
      );
      expect(mockPrisma.invoice.findFirst).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('should reject file with invalid type', async () => {
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['File type not allowed']
      });

      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'test-invoice-id',
        userId: 'test-user-id'
      });

      await expect(service.uploadAttachment({
        ...mockUploadOptions,
        fileType: 'application/x-executable'
      })).rejects.toThrow(AppError);

      expect(FileValidationUtil.validateFile).toHaveBeenCalled();
    });

    it('should reject file when user lacks access to invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.uploadAttachment(mockUploadOptions))
        .rejects.toThrow('Invoice not found or access denied');
    });

    it('should reject when file count quota exceeded', async () => {
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: true,
        fileHash: 'test-hash',
        secureFileName: 'secure-test.pdf',
        mimeType: 'application/pdf',
        errors: []
      });

      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'test-invoice-id',
        userId: 'test-user-id'
      });

      // Mock 5 existing attachments (quota limit)
      mockPrisma.invoiceAttachment.findMany.mockResolvedValue(
        Array(5).fill({ fileSize: BigInt(1024 * 1024) })
      );

      await expect(service.uploadAttachment(mockUploadOptions))
        .rejects.toThrow('Maximum 5 files per invoice exceeded');
    });

    it('should reject when total size quota exceeded', async () => {
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: true,
        fileHash: 'test-hash',
        secureFileName: 'secure-test.pdf',
        mimeType: 'application/pdf',
        errors: []
      });

      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'test-invoice-id',
        userId: 'test-user-id'
      });

      // Mock existing attachments with large total size
      mockPrisma.invoiceAttachment.findMany.mockResolvedValue([
        { fileSize: BigInt(45 * 1024 * 1024) }
      ]);

      const largeFile = {
        ...mockUploadOptions,
        fileBuffer: Buffer.alloc(10 * 1024 * 1024) // 10MB file
      };

      await expect(service.uploadAttachment(largeFile))
        .rejects.toThrow('Total file size limit (50MB) would be exceeded');
    });

    it('should handle file system errors gracefully', async () => {
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: true,
        fileHash: 'test-hash',
        secureFileName: 'secure-test.pdf',
        mimeType: 'application/pdf',
        errors: []
      });

      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'test-invoice-id',
        userId: 'test-user-id'
      });

      mockPrisma.invoiceAttachment.findMany.mockResolvedValue([]);

      // Mock file write error
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

      await expect(service.uploadAttachment(mockUploadOptions))
        .rejects.toThrow('Failed to upload attachment securely');

      // Verify cleanup attempt
      expect(fs.rm).toHaveBeenCalled();
    });
  });

  describe('downloadAttachment', () => {
    it('should successfully download attachment with integrity check', async () => {
      const mockAttachment = {
        id: 'attachment-id',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: BigInt(1024),
        filePath: 'secure/path/test.pdf',
        description: JSON.stringify({
          fileHash: 'expected-hash'
        }),
        invoice: {
          userId: 'test-user-id'
        }
      };

      mockPrisma.invoiceAttachment.findFirst.mockResolvedValue(mockAttachment);

      const fileBuffer = Buffer.from('test content');
      (fs.readFile as jest.Mock).mockResolvedValue(fileBuffer);

      // Mock hash verification
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHash').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('expected-hash')
      } as any);

      const result = await service.downloadAttachment('attachment-id', 'test-user-id');

      expect(result).toBeDefined();
      expect(result?.attachment.id).toBe('attachment-id');
      expect(result?.buffer).toBe(fileBuffer);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Secure download'),
        expect.any(Object)
      );
    });

    it('should reject download when integrity check fails', async () => {
      const mockAttachment = {
        id: 'attachment-id',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: BigInt(1024),
        filePath: 'secure/path/test.pdf',
        description: JSON.stringify({
          fileHash: 'expected-hash'
        }),
        invoice: {
          userId: 'test-user-id'
        }
      };

      mockPrisma.invoiceAttachment.findFirst.mockResolvedValue(mockAttachment);

      const fileBuffer = Buffer.from('tampered content');
      (fs.readFile as jest.Mock).mockResolvedValue(fileBuffer);

      // Mock hash mismatch
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHash').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('different-hash')
      } as any);

      await expect(service.downloadAttachment('attachment-id', 'test-user-id'))
        .rejects.toThrow('File integrity check failed');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('File integrity check failed'),
        expect.any(Object)
      );
    });

    it('should reject download for unauthorized user', async () => {
      mockPrisma.invoiceAttachment.findFirst.mockResolvedValue(null);

      await expect(service.downloadAttachment('attachment-id', 'wrong-user-id'))
        .rejects.toThrow('Attachment not found or access denied');
    });
  });

  describe('deleteAttachment', () => {
    it('should allow owner to delete attachment', async () => {
      const mockAttachment = {
        id: 'attachment-id',
        invoiceId: 'invoice-id',
        fileName: 'test.pdf',
        filePath: 'secure/path/test.pdf',
        uploadedBy: 'other-user',
        invoice: {
          id: 'invoice-id',
          userId: 'test-user-id' // Owner
        }
      };

      mockPrisma.invoiceAttachment.findFirst.mockResolvedValue(mockAttachment);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'user' });
      mockPrisma.invoiceAttachment.delete.mockResolvedValue(mockAttachment);

      const result = await service.deleteAttachment('attachment-id', 'test-user-id');

      expect(result).toBe(true);
      expect(mockPrisma.invoiceAttachment.delete).toHaveBeenCalledWith({
        where: { id: 'attachment-id' }
      });
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should allow uploader to delete their own attachment', async () => {
      const mockAttachment = {
        id: 'attachment-id',
        invoiceId: 'invoice-id',
        fileName: 'test.pdf',
        filePath: 'secure/path/test.pdf',
        uploadedBy: 'test-user-id', // Uploader
        invoice: {
          id: 'invoice-id',
          userId: 'other-user'
        }
      };

      mockPrisma.invoiceAttachment.findFirst.mockResolvedValue(mockAttachment);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'user' });
      mockPrisma.invoiceAttachment.delete.mockResolvedValue(mockAttachment);

      const result = await service.deleteAttachment('attachment-id', 'test-user-id');

      expect(result).toBe(true);
    });

    it('should allow admin to delete any attachment', async () => {
      const mockAttachment = {
        id: 'attachment-id',
        invoiceId: 'invoice-id',
        fileName: 'test.pdf',
        filePath: 'secure/path/test.pdf',
        uploadedBy: 'other-user',
        invoice: {
          id: 'invoice-id',
          userId: 'another-user'
        }
      };

      mockPrisma.invoiceAttachment.findFirst.mockResolvedValue(mockAttachment);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'admin' });
      mockPrisma.invoiceAttachment.delete.mockResolvedValue(mockAttachment);

      const result = await service.deleteAttachment('attachment-id', 'admin-user-id');

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Attachment securely deleted'),
        expect.objectContaining({ reason: 'admin' })
      );
    });

    it('should reject deletion by unauthorized user', async () => {
      const mockAttachment = {
        id: 'attachment-id',
        invoiceId: 'invoice-id',
        fileName: 'test.pdf',
        filePath: 'secure/path/test.pdf',
        uploadedBy: 'other-user',
        invoice: {
          id: 'invoice-id',
          userId: 'another-user'
        }
      };

      mockPrisma.invoiceAttachment.findFirst.mockResolvedValue(mockAttachment);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'user' });

      await expect(service.deleteAttachment('attachment-id', 'unauthorized-user'))
        .rejects.toThrow('Unauthorized to delete this attachment');
    });
  });

  describe('Security validations', () => {
    it('should prevent path traversal attacks', async () => {
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Filename contains suspicious patterns']
      });

      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'test-invoice-id',
        userId: 'test-user-id'
      });

      const suspiciousOptions = {
        invoiceId: 'test-invoice-id',
        fileName: '../../../etc/passwd',
        fileType: 'application/pdf',
        fileBuffer: Buffer.from('test content'),
        description: 'Test description',
        uploadedBy: 'test-user-id'
      };

      await expect(service.uploadAttachment(suspiciousOptions)).rejects.toThrow(AppError);
    });

    it('should enforce secure file permissions', async () => {
      await service.init();

      expect(fs.mkdir).toHaveBeenCalledWith(
        '/test/storage',
        { recursive: true }
      );
      expect(fs.chmod).toHaveBeenCalledWith(
        '/test/storage',
        0o700
      );
    });
  });
});