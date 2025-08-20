import { PrismaClient, Prisma } from '@prisma/client';
import type { Invoice } from '@prisma/client';

// Initialize Prisma client configured for financial schema
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
}

export interface InvoiceFormData {
  invoiceNumber?: string;
  clientId?: string;
  clientName: string;
  clientTaxId: string;
  clientAddress?: any;
  type?: string;
  status?: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  serviceStartDate?: string | Date;
  serviceEndDate?: string | Date;
  currency?: string;
  items: InvoiceItem[];
  subtotal?: number;
  taxAmount?: number;
  taxRate?: number;
  taxType?: string;
  discount?: number;
  discountType?: string;
  total?: number;
  paymentMethod?: string;
  paymentTerms?: number;
  bankAccount?: string;
  notes?: string;
  termsAndConditions?: string;
  templateId?: string;
  tags?: string[];
  customFields?: any;
}

export interface InvoiceQuery {
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
}

export class InvoiceService {
  /**
   * Get all invoices with pagination and filtering
   */
  async getInvoices(params: InvoiceQuery) {
    const {
      userId,
      limit = 20,
      offset = 0,
      search,
      status,
      clientId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;

    try {
      // Build where clause
      const where: Prisma.InvoiceWhereInput = {
        userId,
        ...(status && { status }),
        ...(clientId && { clientId }),
        ...(startDate &&
          endDate && {
            issueDate: {
              gte: startDate,
              lte: endDate,
            },
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
            },
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
      console.error('Error fetching invoices:', error);
      throw new Error('Failed to fetch invoices');
    }
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoiceById(invoiceId: string, userId?: string) {
    try {
      const where: Prisma.InvoiceWhereInput = { 
        id: invoiceId,
        ...(userId && { userId }),
      };

      const invoice = await prisma.invoice.findFirst({
        where,
        include: {
          client: true,
          invoiceAttachments: true,
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string, userId?: string) {
    try {
      const where: Prisma.InvoiceWhereInput = { 
        invoiceNumber,
        ...(userId && { userId }),
      };

      const invoice = await prisma.invoice.findFirst({
        where,
        include: {
          client: true,
          invoiceAttachments: true,
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      console.error('Error fetching invoice by number:', error);
      throw error;
    }
  }

  /**
   * Create a new invoice
   */
  async createInvoice(data: InvoiceFormData, userId: string) {
    try {
      // Generate invoice number if not provided
      let invoiceNumber = data.invoiceNumber;
      if (!invoiceNumber) {
        const count = await prisma.invoice.count();
        const year = new Date().getFullYear();
        invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
      }

      // Validate invoice number is unique
      const existing = await prisma.invoice.findFirst({
        where: { invoiceNumber },
      });
      if (existing) {
        throw new Error(`Invoice number ${invoiceNumber} already exists`);
      }

      // Calculate totals if not provided
      const subtotal =
        data.subtotal ||
        data.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ||
        0;
      const taxAmount = data.taxAmount || subtotal * ((data.taxRate || 0) / 100);
      const total = data.total || subtotal + taxAmount - (data.discount || 0);

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          userId,
          invoiceNumber,
          clientId: data.clientId,
          clientName: data.clientName || '',
          clientTaxId: data.clientTaxId || '',
          clientAddress: data.clientAddress
            ? JSON.parse(JSON.stringify(data.clientAddress))
            : null,
          type: data.type || 'invoice',
          status: data.status || 'draft',
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate: data.dueDate
            ? new Date(data.dueDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          serviceStartDate: data.serviceStartDate ? new Date(data.serviceStartDate) : null,
          serviceEndDate: data.serviceEndDate ? new Date(data.serviceEndDate) : null,
          currency: data.currency || 'EUR',
          items: data.items as any,
          subtotal,
          taxAmount,
          taxRate: data.taxRate || 21,
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

      console.log(`Invoice created: ${invoice.invoiceNumber} for client ${invoice.clientName}`);

      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      if ((error as any).code === 'P2002') {
        throw new Error('Invoice with this number already exists');
      }
      throw new Error('Failed to create invoice');
    }
  }

  /**
   * Update an invoice
   */
  async updateInvoice(invoiceId: string, data: Partial<InvoiceFormData>, userId?: string) {
    try {
      // Check if invoice exists and belongs to user
      const existing = await this.getInvoiceById(invoiceId, userId);
      if (!existing) {
        throw new Error('Invoice not found');
      }

      // Recalculate totals if items changed
      let subtotal = data.subtotal;
      let taxAmount = data.taxAmount;
      let total = data.total;

      if (data.items) {
        subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const taxRateNumber = data.taxRate || Number(existing.data.invoice.taxRate);
        taxAmount = subtotal * (taxRateNumber / 100);
        total = subtotal + taxAmount - (data.discount || 0);
      }

      const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(data.clientId && { clientId: data.clientId }),
          ...(data.clientName && { clientName: data.clientName }),
          ...(data.clientTaxId && { clientTaxId: data.clientTaxId }),
          ...(data.clientAddress && {
            clientAddress: JSON.parse(JSON.stringify(data.clientAddress)),
          }),
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
          ...(data.termsAndConditions !== undefined && {
            termsAndConditions: data.termsAndConditions,
          }),
          ...(data.templateId !== undefined && { templateId: data.templateId }),
          ...(data.tags && { tags: data.tags }),
          ...(data.customFields && { customFields: data.customFields }),
          updatedAt: new Date(),
        },
        include: {
          client: true,
        },
      });

      console.log(`Invoice updated: ${invoice.invoiceNumber}`);

      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  /**
   * Delete an invoice
   */
  async deleteInvoice(invoiceId: string, userId?: string) {
    try {
      // Check if invoice exists and belongs to user
      const existing = await this.getInvoiceById(invoiceId, userId);
      if (!existing) {
        throw new Error('Invoice not found');
      }

      // Only allow deletion of draft invoices
      if (existing.data.invoice.status !== 'draft') {
        throw new Error('Only draft invoices can be deleted');
      }

      await prisma.invoice.delete({
        where: { id: invoiceId },
      });

      console.log(`Invoice deleted: ${invoiceId}`);

      return {
        success: true,
        message: 'Invoice deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(userId?: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const where: Prisma.InvoiceWhereInput = {
        ...(userId && { userId }),
        status: {
          in: ['sent', 'viewed'],
        },
        dueDate: {
          lt: today,
        },
      };

      const invoices = await prisma.invoice.findMany({
        where,
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
      console.error('Error fetching overdue invoices:', error);
      throw new Error('Failed to fetch overdue invoices');
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(
    userId?: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      currency?: string;
    }
  ) {
    try {
      const { startDate, endDate, currency = 'EUR' } = params || {};

      const where: Prisma.InvoiceWhereInput = {
        ...(userId && { userId }),
        currency,
        ...(startDate &&
          endDate && {
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
      const statusCountMap = statusCounts.reduce(
        (acc, curr) => {
          acc[`${curr.status}Invoices`] = curr._count.id;
          return acc;
        },
        {} as Record<string, number>
      );

      // Transform total amounts to object
      const totalAmountMap = totalAmounts.reduce(
        (acc, curr) => {
          acc[`${curr.status}Total`] = curr._sum.total ? Number(curr._sum.total) : 0;
          return acc;
        },
        {} as Record<string, number>
      );

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
      console.error('Error fetching invoice stats:', error);
      throw new Error('Failed to fetch invoice statistics');
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId: string, status: string, userId?: string) {
    try {
      // Check if invoice exists and belongs to user
      const existing = await this.getInvoiceById(invoiceId, userId);
      if (!existing) {
        throw new Error('Invoice not found');
      }

      const updateData: any = { status };

      // Set additional fields based on status
      if (status === 'paid') {
        updateData.paidDate = new Date();
      } else if (status === 'sent') {
        updateData.sentAt = new Date();
      }

      const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: updateData,
      });

      console.log(`Invoice status updated: ${invoice.invoiceNumber} -> ${status}`);

      return {
        success: true,
        data: {
          invoice,
        },
      };
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  /**
   * Map database field names
   */
  private mapFieldName(field: string): string {
    const fieldMap: Record<string, string> = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      issue_date: 'issueDate',
      due_date: 'dueDate',
      invoice_number: 'invoiceNumber',
      client_name: 'clientName',
    };
    return fieldMap[field] || field;
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();