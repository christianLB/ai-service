import { PrismaClient, Prisma } from '@prisma/client';
import type { InvoiceAttachment } from '@prisma/client';

// Initialize Prisma client configured for financial schema
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export interface InvoiceAttachmentData {
  invoiceId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  description?: string;
  uploadedBy: string;
}

export interface AttachmentQuery {
  invoiceId?: string;
  fileType?: string;
  uploadedBy?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class InvoiceAttachmentService {
  /**
   * Get all attachments with pagination and filtering
   */
  async getAttachments(params: AttachmentQuery = {}) {
    const {
      invoiceId,
      fileType,
      uploadedBy,
      limit = 20,
      offset = 0,
      sortBy = 'uploadedAt',
      sortOrder = 'DESC',
    } = params;

    try {
      // Build where clause
      const where: Prisma.InvoiceAttachmentWhereInput = {
        isDeleted: false,
        ...(invoiceId && { invoiceId }),
        ...(fileType && { fileType }),
        ...(uploadedBy && { uploadedBy }),
      };

      // Get total count
      const total = await prisma.invoiceAttachment.count({ where });

      // Get attachments
      const attachments = await prisma.invoiceAttachment.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() as any },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              clientName: true,
            },
          },
        },
      });

      return {
        success: true,
        data: {
          attachments,
          total,
          limit,
          offset,
        },
      };
    } catch (error) {
      console.error('Error fetching attachments:', error);
      throw new Error('Failed to fetch attachments');
    }
  }

  /**
   * Get a single attachment by ID
   */
  async getAttachmentById(attachmentId: string) {
    try {
      const attachment = await prisma.invoiceAttachment.findUnique({
        where: { id: attachmentId },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              clientName: true,
            },
          },
        },
      });

      if (!attachment || attachment.isDeleted) {
        throw new Error('Attachment not found');
      }

      return {
        success: true,
        data: {
          attachment,
        },
      };
    } catch (error) {
      console.error('Error fetching attachment:', error);
      throw error;
    }
  }

  /**
   * Get attachments by invoice ID
   */
  async getAttachmentsByInvoiceId(invoiceId: string) {
    try {
      const attachments = await prisma.invoiceAttachment.findMany({
        where: {
          invoiceId,
          isDeleted: false,
        },
        orderBy: { uploadedAt: 'desc' },
      });

      return {
        success: true,
        data: {
          attachments,
          count: attachments.length,
        },
      };
    } catch (error) {
      console.error('Error fetching attachments by invoice ID:', error);
      throw new Error('Failed to fetch attachments');
    }
  }

  /**
   * Create a new attachment
   */
  async createAttachment(data: InvoiceAttachmentData) {
    try {
      // Verify invoice exists
      const invoice = await prisma.invoice.findUnique({
        where: { id: data.invoiceId },
        select: { id: true },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const attachment = await prisma.invoiceAttachment.create({
        data: {
          invoiceId: data.invoiceId,
          fileName: data.fileName,
          filePath: data.filePath,
          fileSize: BigInt(data.fileSize),
          fileType: data.fileType,
          description: data.description,
          uploadedBy: data.uploadedBy,
        },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              clientName: true,
            },
          },
        },
      });

      console.log(`Attachment created: ${attachment.fileName} for invoice ${data.invoiceId}`);

      return {
        success: true,
        data: { attachment },
        message: 'Attachment created successfully',
      };
    } catch (error) {
      console.error('Error creating attachment:', error);
      if ((error as any).code === 'P2003') {
        throw new Error('Invoice not found');
      }
      throw new Error('Failed to create attachment');
    }
  }

  /**
   * Update an attachment
   */
  async updateAttachment(attachmentId: string, updates: Partial<InvoiceAttachmentData>) {
    try {
      // Check if attachment exists
      const existing = await this.getAttachmentById(attachmentId);
      if (!existing) {
        throw new Error('Attachment not found');
      }

      const attachment = await prisma.invoiceAttachment.update({
        where: { id: attachmentId },
        data: {
          ...(updates.fileName && { fileName: updates.fileName }),
          ...(updates.filePath && { filePath: updates.filePath }),
          ...(updates.fileSize !== undefined && { fileSize: BigInt(updates.fileSize) }),
          ...(updates.fileType && { fileType: updates.fileType }),
          ...(updates.description !== undefined && { description: updates.description }),
        },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              clientName: true,
            },
          },
        },
      });

      console.log(`Attachment updated: ${attachmentId}`);

      return {
        success: true,
        data: { attachment },
        message: 'Attachment updated successfully',
      };
    } catch (error) {
      console.error('Error updating attachment:', error);
      throw error;
    }
  }

  /**
   * Soft delete an attachment
   */
  async deleteAttachment(attachmentId: string, deletedBy: string) {
    try {
      // Check if attachment exists
      const existing = await this.getAttachmentById(attachmentId);
      if (!existing) {
        throw new Error('Attachment not found');
      }

      await prisma.invoiceAttachment.update({
        where: { id: attachmentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
      });

      console.log(`Attachment soft deleted: ${attachmentId} by ${deletedBy}`);

      return {
        success: true,
        message: 'Attachment deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }

  /**
   * Permanently delete an attachment
   */
  async permanentlyDeleteAttachment(attachmentId: string) {
    try {
      // Check if attachment exists
      const existing = await prisma.invoiceAttachment.findUnique({
        where: { id: attachmentId },
      });

      if (!existing) {
        throw new Error('Attachment not found');
      }

      await prisma.invoiceAttachment.delete({
        where: { id: attachmentId },
      });

      console.log(`Attachment permanently deleted: ${attachmentId}`);

      return {
        success: true,
        message: 'Attachment permanently deleted',
      };
    } catch (error) {
      console.error('Error permanently deleting attachment:', error);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted attachment
   */
  async restoreAttachment(attachmentId: string) {
    try {
      // Check if attachment exists and is deleted
      const existing = await prisma.invoiceAttachment.findUnique({
        where: { id: attachmentId },
      });

      if (!existing) {
        throw new Error('Attachment not found');
      }

      if (!existing.isDeleted) {
        throw new Error('Attachment is not deleted');
      }

      const attachment = await prisma.invoiceAttachment.update({
        where: { id: attachmentId },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              clientName: true,
            },
          },
        },
      });

      console.log(`Attachment restored: ${attachmentId}`);

      return {
        success: true,
        data: { attachment },
        message: 'Attachment restored successfully',
      };
    } catch (error) {
      console.error('Error restoring attachment:', error);
      throw error;
    }
  }

  /**
   * Get attachment statistics
   */
  async getAttachmentStats(params?: {
    invoiceId?: string;
    uploadedBy?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const { invoiceId, uploadedBy, startDate, endDate } = params || {};

      const where: Prisma.InvoiceAttachmentWhereInput = {
        isDeleted: false,
        ...(invoiceId && { invoiceId }),
        ...(uploadedBy && { uploadedBy }),
        ...(startDate &&
          endDate && {
            uploadedAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const [
        totalAttachments,
        fileTypeCounts,
        totalSize,
        deletedCount,
      ] = await Promise.all([
        // Total count
        prisma.invoiceAttachment.count({ where }),

        // Count by file type
        prisma.invoiceAttachment.groupBy({
          by: ['fileType'],
          where,
          _count: {
            id: true,
          },
        }),

        // Total file size
        prisma.invoiceAttachment.aggregate({
          where,
          _sum: {
            fileSize: true,
          },
        }),

        // Count of deleted attachments
        prisma.invoiceAttachment.count({
          where: {
            ...where,
            isDeleted: true,
          },
        }),
      ]);

      // Transform file type counts to object
      const fileTypeCountMap = fileTypeCounts.reduce(
        (acc, curr) => {
          acc[curr.fileType] = curr._count.id;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        success: true,
        data: {
          overview: {
            totalAttachments,
            deletedAttachments: deletedCount,
            totalSizeBytes: totalSize._sum.fileSize ? Number(totalSize._sum.fileSize) : 0,
            fileTypes: fileTypeCountMap,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching attachment stats:', error);
      throw new Error('Failed to fetch attachment statistics');
    }
  }

  /**
   * Bulk delete attachments
   */
  async bulkDeleteAttachments(attachmentIds: string[], deletedBy: string) {
    try {
      const result = await prisma.invoiceAttachment.updateMany({
        where: {
          id: {
            in: attachmentIds,
          },
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
      });

      console.log(`Bulk deleted ${result.count} attachments by ${deletedBy}`);

      return {
        success: true,
        data: {
          deletedCount: result.count,
        },
        message: `${result.count} attachments deleted successfully`,
      };
    } catch (error) {
      console.error('Error bulk deleting attachments:', error);
      throw new Error('Failed to delete attachments');
    }
  }
}

// Export singleton instance
export const invoiceAttachmentService = new InvoiceAttachmentService();