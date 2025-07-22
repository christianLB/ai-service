import { prisma } from '../lib/prisma';
import { 
  InvoiceTemplate, 
  CreateInvoiceTemplate, 
  UpdateInvoiceTemplate,
  InvoiceTemplateQuery,
  InvoiceTemplateWithRelations
} from '../types/invoice-template.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

// InvoiceTemplate is in the financial schema
const TABLE_NAME = 'financial.invoice_templates';

export class InvoiceTemplateService {
  /**
   * Get all invoicetemplates with pagination and filtering
   */
  async getAll(query: InvoiceTemplateQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.InvoiceTemplateWhereInput = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
                      ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.invoiceTemplate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
          },
        }),
        prisma.invoiceTemplate.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in InvoiceTemplateService.getAll:', error);
      throw new AppError('Failed to fetch invoicetemplates', 500);
    }
  }

  /**
   * Get a single invoicetemplate by ID
   */
  async getById(id: string, userId?: string): Promise<InvoiceTemplateWithRelations | null> {
    try {
      const invoiceTemplate = await prisma.invoiceTemplate.findFirst({
        where: { 
          id,
        },
        include: {
        },
      });

      if (!invoiceTemplate) {
        throw new AppError('InvoiceTemplate not found', 404);
      }

      return invoiceTemplate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in InvoiceTemplateService.getById:', error);
      throw new AppError('Failed to fetch invoicetemplate', 500);
    }
  }

  /**
   * Create a new invoicetemplate
   */
  async create(data: CreateInvoiceTemplate, userId?: string): Promise<InvoiceTemplate> {
    try {

      const invoiceTemplate = await prisma.invoiceTemplate.create({
        data: {
          ...data,
        },
      });

      logger.info(`InvoiceTemplate created: ${ invoiceTemplate.id }`);
      return invoiceTemplate;
    } catch (error) {
      logger.error('Error in InvoiceTemplateService.create:', error);
      if (error.code === 'P2002') {
        throw new AppError('InvoiceTemplate with this data already exists', 409);
      }
      throw new AppError('Failed to create invoicetemplate', 500);
    }
  }

  /**
   * Update a invoicetemplate
   */
  async update(id: string, data: UpdateInvoiceTemplate, userId?: string): Promise<InvoiceTemplate> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('InvoiceTemplate not found', 404);
      }

      const invoiceTemplate = await prisma.invoiceTemplate.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`InvoiceTemplate updated: ${id}`);
      return invoiceTemplate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in InvoiceTemplateService.update:', error);
      throw new AppError('Failed to update invoicetemplate', 500);
    }
  }

  /**
   * Delete a invoicetemplate
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('InvoiceTemplate not found', 404);
      }


      await prisma.invoiceTemplate.delete({
        where: { id },
      });

      logger.info(`InvoiceTemplate deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in InvoiceTemplateService.delete:', error);
      throw new AppError('Failed to delete invoicetemplate', 500);
    }
  }



}

// Export singleton instance
export const invoiceTemplateService = new InvoiceTemplateService();