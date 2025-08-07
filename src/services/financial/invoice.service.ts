import { prisma } from '../../lib/prisma';
import type { Prisma, Invoice } from '../../lib/prisma';
import type { InvoiceFormData } from '../../types/financial/index';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import { InvoiceNumberingService } from './invoice-numbering.service';

export class InvoiceService {
  private numberingService: InvoiceNumberingService;

  constructor() {
    this.numberingService = new InvoiceNumberingService(prisma, {
      defaultPrefix: 'INV',
      defaultFormat: 'PREFIX-YYYY-0000',
      yearlyReset: true
    });
  }
  /**
   * Get all invoices with pagination and filtering
   */
  async getInvoices(params: {
    userId: string;
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const { 
      userId, 
      limit = 20, 
      offset = 0, 
      search, 
      status, 
      clientId,
      startDate,
      endDate,
      sortBy = 'created_at', 
      sortOrder = 'DESC' 
    } = params;

    try {
      // Build where clause
      const where: Prisma.InvoiceWhereInput = {
        userId,
        ...(status && { status }),
        ...(clientId && { clientId }),
        ...(startDate && endDate && {
          issueDate: {
            gte: startDate,
            lte: endDate
          }
        }),
        ...(search && {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { clientName: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Get total count
      const total = await prisma.invoice.count({ where });

      // Get invoices
      const invoices = await prisma.invoice.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [this.mapFieldName(sortBy)]: sortOrder.toLowerCase() as any },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              taxId: true,
            }
          },
        },
      });

      return {
        success: true,
        data: {
          invoices,
          total,
          limit,
          offset,
        },
      };
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      throw new AppError('Failed to fetch invoices', 500);
    }
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoiceById(invoiceId: string, userId: string) {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId },
        include: {
          client: true,
        },
      });

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching invoice:', error);
      throw new AppError('Failed to fetch invoice', 500);
    }
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string, userId: string) {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { invoiceNumber, userId },
        include: {
          client: true,
        },
      });

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching invoice by number:', error);
      throw new AppError('Failed to fetch invoice', 500);
    }
  }

  /**
   * Create a new invoice
   */
  async createInvoice(data: InvoiceFormData, userId: string) {
    try {
      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Generate invoice number if not provided
        let invoiceNumber = data.invoiceNumber;
        
        if (!invoiceNumber) {
          // Use the advanced numbering service
          const series = data.type?.toUpperCase() || 'INVOICE';
          const prefix = this.getInvoicePrefixByType(data.type);
          
          invoiceNumber = await this.numberingService.getNextInvoiceNumber({
            series,
            prefix,
            format: 'PREFIX-YYYY-0000', // Can be made configurable later
          });
        } else {
          // Validate manual invoice number
          const isValid = await this.numberingService.validateInvoiceNumber(invoiceNumber);
          if (!isValid) {
            throw new AppError(`Invoice number ${invoiceNumber} already exists`, 400);
          }
        }

        // Calculate totals if not provided
        const subtotal = data.subtotal || (data.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0);
        const taxAmount = data.taxAmount || (subtotal * ((data.taxRate || 0) / 100));
        const total = data.total || (subtotal + taxAmount - (data.discount || 0));

        // Create invoice within transaction
        const invoice = await tx.invoice.create({
        data: {
          userId,
          invoiceNumber,
          clientId: data.clientId,
          clientName: data.clientName || '',
          clientTaxId: data.clientTaxId || '',
          clientAddress: data.clientAddress ? JSON.parse(JSON.stringify(data.clientAddress)) : null,
          type: data.type || 'invoice',
          status: 'draft',
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          serviceStartDate: data.serviceStartDate ? new Date(data.serviceStartDate) : null,
          serviceEndDate: data.serviceEndDate ? new Date(data.serviceEndDate) : null,
          currency: data.currency || 'EUR',
          items: data.items as any,
          subtotal,
          taxAmount,
          taxRate: data.taxRate,
          taxType: data.taxType || 'IVA',
          discount: data.discount || null,
          discountType: data.discountType || null,
          total,
          paymentMethod: data.paymentMethod || null,
          paymentTerms: data.paymentTerms || 30,
          bankAccount: data.bankAccount || null,
          notes: data.notes || null,
          termsAndConditions: data.termsAndConditions || null,
          templateId: data.templateId || null,
          tags: data.tags || [],
          customFields: data.customFields || {},
        },
        include: {
          client: true,
        },
      });

        logger.info(`Invoice created: ${invoice.invoiceNumber} for client ${invoice.clientName}`);
        return invoice;
      });
      
      return {
        success: true,
        data: {
          invoice: result,
        },
      };
    } catch (error) {
      logger.error('Error creating invoice:', error);
      if ((error as any).code === 'P2002') {
        throw new AppError('Invoice with this number already exists', 409);
      }
      throw new AppError('Failed to create invoice', 500);
    }
  }

  /**
   * Update an invoice
   */
  async updateInvoice(invoiceId: string, data: Partial<InvoiceFormData>, userId: string) {
    try {
      // Check if invoice exists and belongs to user
      const existing = await this.getInvoiceById(invoiceId, userId);
      if (!existing) {
        throw new AppError('Invoice not found', 404);
      }

      // Recalculate totals if items changed
      let subtotal = data.subtotal;
      let taxAmount = data.taxAmount;
      let total = data.total;

      if (data.items) {
        subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxRateNumber = data.taxRate || existing.data.invoice.taxRate.toNumber();
        taxAmount = subtotal * (taxRateNumber / 100);
        total = subtotal + taxAmount - (data.discount || 0);
      }

      const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(data.clientId && { clientId: data.clientId }),
          ...(data.clientName && { clientName: data.clientName }),
          ...(data.clientTaxId && { clientTaxId: data.clientTaxId }),
          ...(data.clientAddress && { clientAddress: JSON.parse(JSON.stringify(data.clientAddress)) }),
          ...(data.type && { type: data.type }),
          ...(data.status && { status: data.status }),
          ...(data.issueDate && { issueDate: new Date(data.issueDate) }),
          ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
          ...(data.serviceStartDate && { serviceStartDate: new Date(data.serviceStartDate) }),
          ...(data.serviceEndDate && { serviceEndDate: new Date(data.serviceEndDate) }),
          ...(data.currency && { currency: data.currency }),
          ...(data.items && { items: data.items as any }),
          ...(subtotal !== undefined && { subtotal }),
          ...(taxAmount !== undefined && { taxAmount }),
          ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
          ...(data.taxType && { taxType: data.taxType }),
          ...(data.discount !== undefined && { discount: data.discount }),
          ...(data.discountType && { discountType: data.discountType }),
          ...(total !== undefined && { total }),
          ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
          ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
          ...(data.bankAccount && { bankAccount: data.bankAccount }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.termsAndConditions !== undefined && { termsAndConditions: data.termsAndConditions }),
          ...(data.templateId !== undefined && { templateId: data.templateId }),
          ...(data.tags && { tags: data.tags }),
          ...(data.customFields && { customFields: data.customFields }),
        },
        include: {
          client: true,
        },
      });

      logger.info(`Invoice updated: ${invoice.invoiceNumber}`);
      
      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating invoice:', error);
      throw new AppError('Failed to update invoice', 500);
    }
  }

  /**
   * Delete an invoice
   */
  async deleteInvoice(invoiceId: string, userId: string) {
    try {
      // Check if invoice exists and belongs to user
      const existing = await this.getInvoiceById(invoiceId, userId);
      if (!existing) {
        throw new AppError('Invoice not found', 404);
      }

      // Only allow deletion of draft invoices
      if (existing.data.invoice.status !== 'draft') {
        throw new AppError('Only draft invoices can be deleted', 400);
      }

      await prisma.invoice.delete({
        where: { id: invoiceId },
      });

      logger.info(`Invoice deleted: ${invoiceId}`);
      
      return {
        success: true,
        message: 'Invoice deleted successfully',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting invoice:', error);
      throw new AppError('Failed to delete invoice', 500);
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(userId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const invoices = await prisma.invoice.findMany({
        where: {
          userId,
          status: {
            in: ['sent', 'viewed'],
          },
          dueDate: {
            lt: today,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

      return {
        success: true,
        data: {
          invoices,
          count: invoices.length,
        },
      };
    } catch (error) {
      logger.error('Error fetching overdue invoices:', error);
      throw new AppError('Failed to fetch overdue invoices', 500);
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(userId: string, params?: {
    startDate?: Date;
    endDate?: Date;
    currency?: string;
  }) {
    try {
      const { startDate, endDate, currency = 'EUR' } = params || {};

      const where: Prisma.InvoiceWhereInput = {
        userId,
        currency,
        ...(startDate && endDate && {
          issueDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      };

      const [totalInvoices, statusCounts, totalAmounts] = await Promise.all([
        // Total count
        prisma.invoice.count({ where }),
        
        // Count by status
        prisma.invoice.groupBy({
          by: ['status'],
          where,
          _count: {
            id: true,
          },
        }),
        
        // Sum totals by status
        prisma.invoice.groupBy({
          by: ['status'],
          where,
          _sum: {
            total: true,
          },
        }),
      ]);

      // Transform status counts to object
      const statusCountMap = statusCounts.reduce((acc, curr) => {
        acc[`${curr.status}Invoices`] = curr._count.id;
        return acc;
      }, {} as Record<string, number>);

      // Transform total amounts to object
      const totalAmountMap = totalAmounts.reduce((acc, curr) => {
        acc[`${curr.status}Total`] = curr._sum.total ? curr._sum.total.toNumber() : 0;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        data: {
          overview: {
            totalInvoices,
            ...statusCountMap,
            totalRevenue: totalAmountMap.paidTotal || 0,
            pendingRevenue: (totalAmountMap.sentTotal || 0) + (totalAmountMap.viewedTotal || 0),
            overdueRevenue: totalAmountMap.overdueTotal || 0,
          },
        },
      };
    } catch (error) {
      logger.error('Error fetching invoice stats:', error);
      throw new AppError('Failed to fetch invoice statistics', 500);
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId: string, status: string, userId: string) {
    try {
      // Check if invoice exists and belongs to user
      const existing = await this.getInvoiceById(invoiceId, userId);
      if (!existing) {
        throw new AppError('Invoice not found', 404);
      }

      const updateData: any = { status };

      // Set additional fields based on status
      if (status === 'paid') {
        updateData.paidDate = new Date();
      } else if (status === 'sent') {
        updateData.sentDate = new Date();
      }

      const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: updateData,
      });

      logger.info(`Invoice status updated: ${invoice.invoiceNumber} -> ${status}`);
      
      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating invoice status:', error);
      throw new AppError('Failed to update invoice status', 500);
    }
  }

  /**
   * Map database field names
   */
  private mapFieldName(field: string): string {
    const fieldMap: Record<string, string> = {
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'issue_date': 'issueDate',
      'due_date': 'dueDate',
      'invoice_number': 'invoiceNumber',
      'client_name': 'clientName',
    };
    return fieldMap[field] || field;
  }

  /**
   * Get invoice prefix based on type
   */
  private getInvoicePrefixByType(type?: string): string {
    const prefixMap: Record<string, string> = {
      'invoice': 'FAC',
      'credit_note': 'NC',
      'proforma': 'PRO',
      'receipt': 'REC',
    };
    return prefixMap[type || 'invoice'] || 'INV';
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();