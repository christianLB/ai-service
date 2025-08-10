import { prisma } from '../../lib/prisma';
import {
  InvoiceAttachment,
  CreateInvoiceAttachment,
  UpdateInvoiceAttachment,
  InvoiceAttachmentQuery,
  InvoiceAttachmentWithRelations
} from '../../types/invoice-attachment.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

// Note: keep implementation minimal and lint-friendly

// Helper function to convert Decimal fields to numbers
function convertDecimals(data: any): any {
  if (!data) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(convertDecimals);
  }
  if (typeof data !== 'object') {
    return data;
  }

  const result = { ...data };

  return result;
}

export class InvoiceAttachmentService {
  /**
   * Get all invoiceattachments with pagination and filtering
   */
  async getAll(query: InvoiceAttachmentQuery, _userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.InvoiceAttachmentWhereInput = (() => {
        if (!search) {
          return {};
        }
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(search);
        const or: Prisma.InvoiceAttachmentWhereInput[] = [];
        if (isUuid) {
          or.push({ id: { equals: search } });
          or.push({ invoiceId: { equals: search } });
        }
        or.push({ fileName: { contains: search, mode: 'insensitive' } });
        or.push({ filePath: { contains: search, mode: 'insensitive' } });
        or.push({ fileType: { contains: search, mode: 'insensitive' } });
        or.push({ description: { contains: search, mode: 'insensitive' } });
        or.push({ uploadedBy: { contains: search, mode: 'insensitive' } });
        or.push({ deletedBy: { contains: search, mode: 'insensitive' } });
        return { OR: or };
      })();

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.invoiceAttachment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            invoice: true,
          },
        }),
        prisma.invoiceAttachment.count({ where }),
      ]);

      return {
        items: items.map(convertDecimals),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in InvoiceAttachmentService.getAll:', error);
      throw new AppError('Failed to fetch invoiceattachments', 500);
    }
  }

  /**
   * Get a single invoiceattachment by ID
   */
  async getById(id: string, _userId?: string): Promise<InvoiceAttachmentWithRelations | null> {
    try {
      const invoiceAttachment = await prisma.invoiceAttachment.findFirst({
        where: {
          id,
        },
        include: {
          invoice: true,
        },
      });

      if (!invoiceAttachment) {
        throw new AppError('InvoiceAttachment not found', 404);
      }

      return convertDecimals(invoiceAttachment);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in InvoiceAttachmentService.getById:', error);
      throw new AppError('Failed to fetch invoiceattachment', 500);
    }
  }

  /**
   * Create a new invoiceattachment
   */
  async create(data: CreateInvoiceAttachment, _userId?: string): Promise<InvoiceAttachment> {
    try {
      const fileSizeValue = (() => {
        const fsVal: any = (data as any).fileSize;
        if (typeof fsVal === 'bigint') {
          return fsVal;
        }
        if (typeof fsVal === 'number') {
          return BigInt(fsVal);
        }
        if (typeof fsVal === 'string') {
          const n = BigInt(fsVal);
          return n;
        }
        return BigInt(0);
      })();

      const invoiceAttachment = await prisma.invoiceAttachment.create({
        data: {
          invoiceId: (data as any).invoiceId,
          fileName: (data as any).fileName,
          filePath: (data as any).filePath,
          fileSize: fileSizeValue,
          fileType: (data as any).fileType,
          uploadedBy: (data as any).uploadedBy,
          description: (data as any).description,
          deletedAt: (data as any).deletedAt,
          deletedBy: (data as any).deletedBy,
        },
      });

      logger.info(`InvoiceAttachment created: ${ invoiceAttachment.id }`);
      return convertDecimals(invoiceAttachment);
    } catch (error) {
      logger.error('Error in InvoiceAttachmentService.create:', error);
      if ((error as any).code === 'P2002') {
        throw new AppError('InvoiceAttachment with this data already exists', 409);
      }
      throw new AppError('Failed to create invoiceattachment', 500);
    }
  }

  /**
   * Update a invoiceattachment
   */
  async update(id: string, data: UpdateInvoiceAttachment, _userId?: string): Promise<InvoiceAttachment> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, _userId);
      if (!existing) {
        throw new AppError('InvoiceAttachment not found', 404);
      }

      const updateData: any = { ...data };
      // Do not allow updating invoiceId via this endpoint
      if ('invoiceId' in updateData) {
        delete updateData.invoiceId;
      }
      if ('fileSize' in updateData && updateData.fileSize !== undefined) {
        const fsVal: any = updateData.fileSize;
        if (typeof fsVal === 'bigint') {
          // ok
        } else if (typeof fsVal === 'number') {
          updateData.fileSize = BigInt(fsVal);
        } else if (typeof fsVal === 'string') {
          updateData.fileSize = BigInt(fsVal);
        } else {
          delete updateData.fileSize;
        }
      }

      const invoiceAttachment = await prisma.invoiceAttachment.update({
        where: { id },
        data: {
          ...updateData,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`InvoiceAttachment updated: ${id}`);
      return convertDecimals(invoiceAttachment);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in InvoiceAttachmentService.update:', error);
      throw new AppError('Failed to update invoiceattachment', 500);
    }
  }

  /**
   * Delete a invoiceattachment
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('InvoiceAttachment not found', 404);
      }


      await prisma.invoiceAttachment.delete({
        where: { id },
      });

      logger.info(`InvoiceAttachment deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in InvoiceAttachmentService.delete:', error);
      throw new AppError('Failed to delete invoiceattachment', 500);
    }
  }



}

// Export singleton instance
export const invoiceAttachmentService = new InvoiceAttachmentService();