import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { invoiceService } from '../../services/financial/invoice.service';
import { clientService } from '../../services/financial/client.service';
import { InvoiceGenerationService } from '../../services/financial/invoice-generation.service';
import { InvoiceStoragePrismaService } from '../../services/financial/invoice-storage.service';
import { InvoiceNumberingService } from '../../services/financial/invoice-numbering.service';
import { getInvoiceEmailService } from '../../services/financial/invoice-email.service';
import { logger } from '../../utils/log';
import { PrismaClient } from '@prisma/client';
import type { Prisma, Invoice, Client } from '../../lib/prisma';
import type { InvoiceFormData } from '../../types/financial/index';
import { DEFAULT_COMPANY_CONFIG } from '../../models/financial/company.model';

// Define InvoiceItem type based on the JSON structure in the database
interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
}

// Default company configuration is imported from company.model.ts

export class InvoicesController {
  private invoiceService = invoiceService;
  private clientService = clientService;
  private invoiceGenerationService: InvoiceGenerationService;
  private invoiceStorageService: InvoiceStoragePrismaService;
  private invoiceNumberingService: InvoiceNumberingService;
  private invoiceEmailService: ReturnType<typeof getInvoiceEmailService>;
  private schemasInitialized = false;
  private prisma: PrismaClient;

  constructor() {
    this.invoiceGenerationService = new InvoiceGenerationService();
    this.invoiceEmailService = getInvoiceEmailService();
    this.prisma = new PrismaClient();

    // Initialize services
    this.invoiceStorageService = new InvoiceStoragePrismaService(this.prisma);
    this.invoiceNumberingService = new InvoiceNumberingService(this.prisma);
  }

  // Helper to convert Decimal to number for JSON serialization
  private convertDecimalToNumber(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    if (value && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    if (value && typeof value.toString === 'function') {
      return parseFloat(value.toString());
    }
    return 0;
  }

  private async ensureSchemasInitialized(): Promise<void> {
    // No schema initialization needed for Prisma - schemas are managed by migrations
    this.schemasInitialized = true;
  }

  /**
   * Create a new invoice
   * POST /api/financial/invoices
   */
  async createInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const invoiceData: InvoiceFormData = req.body;

      // Validate required fields
      if (!invoiceData.clientId || !invoiceData.items || invoiceData.items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: clientId, items',
        });
        return;
      }

      // Extract userId from auth context
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      const result = await this.invoiceService.createInvoice(invoiceData, userId);

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error creating invoice:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create invoice',
        });
      }
    }
  }

  /**
   * Get invoice by ID
   * GET /api/financial/invoices/:id
   */
  async getInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Extract userId from auth context
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      const result = await this.invoiceService.getInvoiceById(id, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting invoice:', error);
      if (error.status === 404) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get invoice',
        });
      }
    }
  }

  /**
   * Get invoice by invoice number
   * GET /api/financial/invoices/number/:invoiceNumber
   */
  async getInvoiceByNumber(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { invoiceNumber } = req.params;
      const userId = (req.user as any)?.userId || req.user?.userId;
      const invoice = await this.invoiceService.getInvoiceByNumber(invoiceNumber, userId);

      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { invoice },
      });
    } catch (error: any) {
      logger.error('Error getting invoice by number:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get invoice',
      });
    }
  }

  /**
   * Update invoice
   * PUT /api/financial/invoices/:id
   */
  async updateInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: Partial<InvoiceFormData> = req.body;

      // Extract userId from auth context
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      const result = await this.invoiceService.updateInvoice(id, updates, userId);

      res.json(result);
    } catch (error: any) {
      logger.error('Error updating invoice:', error);

      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      } else if (error.message.includes('Cannot modify')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update invoice',
        });
      }
    }
  }

  /**
   * List invoices with filters
   * GET /api/financial/invoices
   */
  async listInvoices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        clientId,
        status,
        type,
        startDate,
        endDate,
        search,
        limit = '50',
        offset = '0',
        sortBy = 'issue_date',
        sortOrder = 'DESC',
      } = req.query;

      // Extract userId from auth context
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      const result = await this.invoiceService.getInvoices({
        userId,
        clientId: clientId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error listing invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list invoices',
      });
    }
  }

  /**
   * Get overdue invoices
   * GET /api/financial/invoices/overdue
   */
  async getOverdueInvoices(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Extract userId from auth context
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      const result = await this.invoiceService.getOverdueInvoices(userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting overdue invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get overdue invoices',
      });
    }
  }

  /**
   * Mark invoice as paid
   * POST /api/financial/invoices/:id/mark-paid
   */
  async markAsPaid(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { paidDate, paymentReference } = req.body;

      const userId = (req.user as any)?.userId || req.user?.userId;
      const invoice = await this.invoiceService.updateInvoice(
        id,
        {
          status: 'paid',
        },
        userId
      );

      res.json({
        success: true,
        data: { invoice },
        message: 'Invoice marked as paid successfully',
      });
    } catch (error: any) {
      logger.error('Error marking invoice as paid:', error);

      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to mark invoice as paid',
        });
      }
    }
  }

  /**
   * Add item to invoice
   * POST /api/financial/invoices/:id/items
   */
  async addItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.userId || req.user?.userId;
      const item = req.body;

      // Validate item
      if (!item.description || !item.quantity || !item.unitPrice) {
        res.status(400).json({
          success: false,
          error: 'Missing required item fields: description, quantity, unitPrice',
        });
        return;
      }

      // Get current invoice
      const currentInvoiceResult = await this.invoiceService.getInvoiceById(id, userId);
      if (!currentInvoiceResult.success || !currentInvoiceResult.data.invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
        return;
      }

      const currentInvoice = currentInvoiceResult.data.invoice;
      // Add new item to existing items
      const existingItems = Array.isArray(currentInvoice.items)
        ? (currentInvoice.items as unknown as InvoiceItem[])
        : [];
      const updatedItems = [...existingItems, item];

      // Update invoice with new items
      const invoice = await this.invoiceService.updateInvoice(id, { items: updatedItems }, userId);

      res.json({
        success: true,
        data: { invoice },
        message: 'Item added to invoice successfully',
      });
    } catch (error: any) {
      logger.error('Error adding item to invoice:', error);

      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      } else if (error.message.includes('Cannot modify')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to add item to invoice',
        });
      }
    }
  }

  /**
   * Attach document to invoice
   * POST /api/financial/invoices/:id/attachments
   */
  async attachDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, documentId, fileName, description } = req.body;

      if (!type || !documentId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: type, documentId',
        });
        return;
      }

      const userId = (req.user as any)?.userId || req.user?.userId;

      // Update invoice metadata to include the attachment
      const currentInvoiceResult = await this.invoiceService.getInvoiceById(id, userId);
      if (!currentInvoiceResult.success || !currentInvoiceResult.data.invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
        return;
      }

      const currentInvoice = currentInvoiceResult.data.invoice;
      const customFields = (currentInvoice.customFields as any) || {};
      const attachments = customFields.attachments || [];
      attachments.push({
        type,
        documentId,
        fileName,
        description,
        attachedAt: new Date(),
      });

      const invoice = await this.invoiceService.updateInvoice(
        id,
        { customFields: { ...customFields, attachments } },
        userId
      );

      res.json({
        success: true,
        data: { invoice },
        message: 'Document attached to invoice successfully',
      });
    } catch (error: any) {
      logger.error('Error attaching document to invoice:', error);

      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to attach document to invoice',
        });
      }
    }
  }

  /**
   * Get client invoice statistics
   * GET /api/financial/invoices/stats/client/:clientId
   */
  async getClientInvoiceStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;
      const stats = await this.invoiceService.getInvoiceStats(clientId);

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error: any) {
      logger.error('Error getting client invoice stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get client invoice statistics',
      });
    }
  }

  /**
   * Delete invoice (cancel)
   * DELETE /api/financial/invoices/:id
   */
  async deleteInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.userId || req.user?.userId;
      await this.invoiceService.deleteInvoice(id, userId);

      res.json({
        success: true,
        message: 'Invoice cancelled successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting invoice:', error);

      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      } else if (error.message.includes('Cannot delete')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete invoice',
        });
      }
    }
  }

  /**
   * Send invoice (mark as sent and update sent_at)
   * POST /api/financial/invoices/:id/send
   */
  async sendInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sendMethod = 'email', recipients } = req.body;

      // Update invoice status to sent
      const userId = (req.user as any)?.userId || req.user?.userId;
      const invoice = await this.invoiceService.updateInvoice(
        id,
        {
          status: 'sent',
        },
        userId
      );

      // TODO: Here would be the actual sending logic (email, Telegram, etc.)
      // For now, we just update the status

      res.json({
        success: true,
        data: {
          invoice,
          sendMethod,
          recipients,
        },
        message: 'Invoice sent successfully',
      });
    } catch (error: any) {
      logger.error('Error sending invoice:', error);

      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send invoice',
        });
      }
    }
  }

  /**
   * Duplicate invoice (create copy with new number)
   * POST /api/financial/invoices/:id/duplicate
   */
  async duplicateInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.userId || req.user?.userId;
      const originalInvoiceResult = await this.invoiceService.getInvoiceById(id, userId);

      if (!originalInvoiceResult.success || !originalInvoiceResult.data.invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
        return;
      }

      const originalInvoice = originalInvoiceResult.data.invoice;
      // Create new invoice based on original
      const duplicateData: InvoiceFormData = {
        clientId: originalInvoice.clientId || undefined,
        clientName: originalInvoice.clientName,
        currency: originalInvoice.currency,
        taxAmount: this.convertDecimalToNumber(originalInvoice.taxAmount),
        subtotal: this.convertDecimalToNumber(originalInvoice.subtotal),
        totalAmount: this.convertDecimalToNumber(originalInvoice.total),
        notes: originalInvoice.notes || undefined,
        terms: originalInvoice.termsAndConditions || undefined,
        templateId: originalInvoice.templateId || undefined,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: Array.isArray(originalInvoice.items)
          ? (originalInvoice.items as unknown as InvoiceItem[])
          : [],
        taxRate: this.convertDecimalToNumber(originalInvoice.taxRate),
      };

      const newInvoiceResult = await this.invoiceService.createInvoice(duplicateData, userId);

      res.status(201).json({
        success: true,
        data: { invoice: newInvoiceResult.data.invoice },
        message: `Invoice duplicated from ${originalInvoice.invoiceNumber}`,
      });
    } catch (error: any) {
      logger.error('Error duplicating invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to duplicate invoice',
      });
    }
  }

  /**
   * Generate PDF for invoice
   * POST /api/financial/invoices/:id/generate-pdf
   */
  async generatePDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized for storage
      await this.ensureSchemasInitialized();

      const { id } = req.params;
      const { language, showStatus = true, generateQR = true } = req.body;
      const userId = (req.user as any)?.userId || req.user?.userId;

      // Get invoice and client
      const invoiceResult = await this.invoiceService.getInvoiceById(id, userId);
      if (!invoiceResult.success || !invoiceResult.data.invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
        return;
      }

      const invoice = invoiceResult.data.invoice;
      if (!invoice.clientId) {
        res.status(400).json({
          success: false,
          error: 'Invoice has no client ID',
        });
        return;
      }
      const clientResult = await this.clientService.getClientById(invoice.clientId, userId);
      if (!clientResult.success || !clientResult.data.client) {
        res.status(404).json({
          success: false,
          error: 'Client not found',
        });
        return;
      }

      const client = clientResult.data.client;

      // Convert Decimal fields to numbers for PDF generation
      const invoiceForPDF = {
        ...invoice,
        subtotal: this.convertDecimalToNumber(invoice.subtotal),
        taxAmount: this.convertDecimalToNumber(invoice.taxAmount),
        taxRate: this.convertDecimalToNumber(invoice.taxRate),
        discount: invoice.discount ? this.convertDecimalToNumber(invoice.discount) : undefined,
        total: this.convertDecimalToNumber(invoice.total),
        exchangeRate: invoice.exchangeRate
          ? this.convertDecimalToNumber(invoice.exchangeRate)
          : undefined,
        // Ensure items are properly structured
        items: Array.isArray(invoice.items) ? invoice.items : [],
        // Map empty strings to undefined for optional fields
        relatedDocuments: invoice.relatedDocuments || undefined,
        relatedTransactionIds: invoice.relatedTransactionIds || undefined,
        notes: invoice.notes || undefined,
        termsAndConditions: invoice.termsAndConditions || undefined,
        customFields: invoice.customFields || {},
        metadata: invoice.customFields || {},
      } as any;

      const clientForPDF = {
        ...client,
        creditLimit: client.creditLimit
          ? this.convertDecimalToNumber(client.creditLimit)
          : undefined,
        totalRevenue: this.convertDecimalToNumber(client.totalRevenue),
        outstandingBalance: this.convertDecimalToNumber(client.outstandingBalance),
        averageInvoiceAmount: client.averageInvoiceAmount
          ? this.convertDecimalToNumber(client.averageInvoiceAmount)
          : undefined,
        // Handle missing fields from old Client model
        website: undefined,
        isActive: client.status === 'active',
        metadata: client.customFields || {},
      } as any;

      // Generate PDF
      const result = await this.invoiceGenerationService.generateInvoicePDF({
        invoice: invoiceForPDF,
        client: clientForPDF,
        company: DEFAULT_COMPANY_CONFIG,
        language: language || client.language || 'en',
        showStatus,
        generateQR,
      });

      // Store PDF
      const stored = await this.invoiceStorageService.storeInvoice(
        invoice.id,
        invoice.invoiceNumber,
        result.pdfBuffer,
        result.fileName,
        { generatePublicUrl: true }
      );

      // Store PDF URL in customFields
      const currentInvoiceRes = await this.invoiceService.getInvoiceById(id, userId);
      if (currentInvoiceRes.success && currentInvoiceRes.data.invoice) {
        const customFields = (currentInvoiceRes.data.invoice.customFields as any) || {};
        await this.invoiceService.updateInvoice(
          id,
          {
            customFields: {
              ...customFields,
              pdfUrl: stored.url,
            },
          },
          userId
        );
      }

      res.json({
        success: true,
        data: {
          fileName: result.fileName,
          fileSize: stored.fileSize,
          url: stored.url,
          storedAt: stored.createdAt,
        },
        message: 'Invoice PDF generated successfully',
      });
    } catch (error: any) {
      logger.error('Error generating invoice PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate invoice PDF',
      });
    }
  }

  /**
   * Download invoice PDF
   * GET /api/financial/invoices/:id/download-pdf
   */
  async downloadPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized for storage
      await this.ensureSchemasInitialized();

      const { id } = req.params;

      // Retrieve stored PDF
      const result = await this.invoiceStorageService.retrieveInvoice(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Invoice PDF not found',
        });
        return;
      }

      // Set headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.metadata.fileName}"`);
      res.setHeader('Content-Length', result.buffer.length.toString());

      // Send PDF
      res.send(result.buffer);
    } catch (error: any) {
      logger.error('Error downloading invoice PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download invoice PDF',
      });
    }
  }

  /**
   * Preview invoice HTML
   * GET /api/financial/invoices/:id/preview
   */
  async previewInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { language } = req.query;
      const userId = (req.user as any)?.userId || req.user?.userId;

      // Get invoice and client
      const invoiceResult = await this.invoiceService.getInvoiceById(id, userId);
      if (!invoiceResult.success || !invoiceResult.data.invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
        return;
      }

      const invoice = invoiceResult.data.invoice;
      if (!invoice.clientId) {
        res.status(400).json({
          success: false,
          error: 'Invoice has no client ID',
        });
        return;
      }
      const clientResult = await this.clientService.getClientById(invoice.clientId, userId);
      if (!clientResult.success || !clientResult.data.client) {
        res.status(404).json({
          success: false,
          error: 'Client not found',
        });
        return;
      }

      const client = clientResult.data.client;

      // Convert Decimal fields to numbers for HTML preview
      const invoiceForPreview = {
        ...invoice,
        subtotal: this.convertDecimalToNumber(invoice.subtotal),
        taxAmount: this.convertDecimalToNumber(invoice.taxAmount),
        taxRate: this.convertDecimalToNumber(invoice.taxRate),
        discount: invoice.discount ? this.convertDecimalToNumber(invoice.discount) : undefined,
        total: this.convertDecimalToNumber(invoice.total),
        exchangeRate: invoice.exchangeRate
          ? this.convertDecimalToNumber(invoice.exchangeRate)
          : undefined,
        // Ensure items are properly structured
        items: Array.isArray(invoice.items) ? invoice.items : [],
        // Map empty strings to undefined for optional fields
        relatedDocuments: invoice.relatedDocuments || undefined,
        relatedTransactionIds: invoice.relatedTransactionIds || undefined,
        notes: invoice.notes || undefined,
        termsAndConditions: invoice.termsAndConditions || undefined,
        customFields: invoice.customFields || {},
        metadata: invoice.customFields || {},
      } as any;

      const clientForPreview = {
        ...client,
        creditLimit: client.creditLimit
          ? this.convertDecimalToNumber(client.creditLimit)
          : undefined,
        totalRevenue: this.convertDecimalToNumber(client.totalRevenue),
        outstandingBalance: this.convertDecimalToNumber(client.outstandingBalance),
        averageInvoiceAmount: client.averageInvoiceAmount
          ? this.convertDecimalToNumber(client.averageInvoiceAmount)
          : undefined,
        // Handle missing fields from old Client model
        website: undefined,
        isActive: client.status === 'active',
        metadata: client.customFields || {},
      } as any;

      // Generate HTML preview
      const html = await this.invoiceGenerationService.previewInvoiceHTML({
        invoice: invoiceForPreview,
        client: clientForPreview,
        company: DEFAULT_COMPANY_CONFIG,
        language: (language as string) || client.language || 'en',
        showStatus: true,
        generateQR: true,
      });

      // Send HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error: any) {
      logger.error('Error previewing invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to preview invoice',
      });
    }
  }

  /**
   * Send invoice by email
   * POST /api/financial/invoices/:id/send-email
   */
  async sendInvoiceEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { subject, message, cc, bcc, language } = req.body;
      const userId = (req.user as any)?.userId || req.user?.userId;

      // Get invoice and client
      const invoiceResult = await this.invoiceService.getInvoiceById(id, userId);
      if (!invoiceResult.success || !invoiceResult.data.invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
        return;
      }

      const invoice = invoiceResult.data.invoice;
      if (!invoice.clientId) {
        res.status(400).json({
          success: false,
          error: 'Invoice has no client ID',
        });
        return;
      }
      const clientResult = await this.clientService.getClientById(invoice.clientId, userId);
      if (!clientResult.success || !clientResult.data.client) {
        res.status(404).json({
          success: false,
          error: 'Client not found',
        });
        return;
      }

      const client = clientResult.data.client;

      // Convert Decimal fields to numbers for email
      const invoiceForEmail = {
        ...invoice,
        subtotal: this.convertDecimalToNumber(invoice.subtotal),
        taxAmount: this.convertDecimalToNumber(invoice.taxAmount),
        taxRate: this.convertDecimalToNumber(invoice.taxRate),
        discount: invoice.discount ? this.convertDecimalToNumber(invoice.discount) : undefined,
        total: this.convertDecimalToNumber(invoice.total),
        exchangeRate: invoice.exchangeRate
          ? this.convertDecimalToNumber(invoice.exchangeRate)
          : undefined,
        // Ensure items are properly structured
        items: Array.isArray(invoice.items) ? invoice.items : [],
        // Map empty strings to undefined for optional fields
        relatedDocuments: invoice.relatedDocuments || undefined,
        relatedTransactionIds: invoice.relatedTransactionIds || undefined,
        notes: invoice.notes || undefined,
        termsAndConditions: invoice.termsAndConditions || undefined,
        customFields: invoice.customFields || {},
        metadata: invoice.customFields || {},
      } as any;

      const clientForEmail = {
        ...client,
        creditLimit: client.creditLimit
          ? this.convertDecimalToNumber(client.creditLimit)
          : undefined,
        totalRevenue: this.convertDecimalToNumber(client.totalRevenue),
        outstandingBalance: this.convertDecimalToNumber(client.outstandingBalance),
        averageInvoiceAmount: client.averageInvoiceAmount
          ? this.convertDecimalToNumber(client.averageInvoiceAmount)
          : undefined,
        // Handle missing fields from old Client model
        website: undefined,
        isActive: client.status === 'active',
        metadata: client.customFields || {},
      } as any;

      // Generate PDF if not already generated
      let pdfBuffer: Buffer;
      const existingPdf = await this.invoiceStorageService.retrieveInvoice(id);

      if (existingPdf) {
        pdfBuffer = existingPdf.buffer;
      } else {
        const result = await this.invoiceGenerationService.generateInvoicePDF({
          invoice: invoiceForEmail,
          client: clientForEmail,
          company: DEFAULT_COMPANY_CONFIG,
          language: language || client.language || 'en',
        });
        pdfBuffer = result.pdfBuffer;

        // Store for future use
        await this.invoiceStorageService.storeInvoice(
          invoice.id,
          invoice.invoiceNumber,
          pdfBuffer,
          result.fileName
        );
      }

      // Send email
      const sent = await this.invoiceEmailService.sendInvoiceEmail({
        invoice: invoiceForEmail,
        client: clientForEmail,
        company: DEFAULT_COMPANY_CONFIG,
        pdfBuffer,
        language: language || client.language || 'en',
        subject,
        message,
        cc,
        bcc,
      });

      if (sent) {
        // Update invoice status
        await this.invoiceService.updateInvoice(
          id,
          {
            status: 'sent',
          },
          userId
        );

        res.json({
          success: true,
          message: 'Invoice sent successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send invoice email',
        });
      }
    } catch (error: any) {
      logger.error('Error sending invoice email:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send invoice email',
      });
    }
  }

  /**
   * Send payment reminder
   * POST /api/financial/invoices/:id/send-reminder
   */
  async sendPaymentReminder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { language } = req.body;
      const userId = (req.user as any)?.userId || req.user?.userId;

      // Get invoice and client
      const invoiceResult = await this.invoiceService.getInvoiceById(id, userId);
      if (!invoiceResult.success || !invoiceResult.data.invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
        return;
      }

      const invoice = invoiceResult.data.invoice;
      if (invoice.status === 'paid') {
        res.status(400).json({
          success: false,
          error: 'Invoice is already paid',
        });
        return;
      }

      if (!invoice.clientId) {
        res.status(400).json({
          success: false,
          error: 'Invoice has no client ID',
        });
        return;
      }
      const clientResult = await this.clientService.getClientById(invoice.clientId, userId);
      if (!clientResult.success || !clientResult.data.client) {
        res.status(404).json({
          success: false,
          error: 'Client not found',
        });
        return;
      }

      const client = clientResult.data.client;

      // Convert Decimal fields to numbers for email
      const invoiceForReminder = {
        ...invoice,
        subtotal: this.convertDecimalToNumber(invoice.subtotal),
        taxAmount: this.convertDecimalToNumber(invoice.taxAmount),
        taxRate: this.convertDecimalToNumber(invoice.taxRate),
        discount: invoice.discount ? this.convertDecimalToNumber(invoice.discount) : undefined,
        total: this.convertDecimalToNumber(invoice.total),
        exchangeRate: invoice.exchangeRate
          ? this.convertDecimalToNumber(invoice.exchangeRate)
          : undefined,
        items: Array.isArray(invoice.items) ? invoice.items : [],
        relatedDocuments: invoice.relatedDocuments || undefined,
        relatedTransactionIds: invoice.relatedTransactionIds || undefined,
        notes: invoice.notes || undefined,
        termsAndConditions: invoice.termsAndConditions || undefined,
        customFields: invoice.customFields || {},
        metadata: invoice.customFields || {},
      } as any;

      const clientForReminder = {
        ...client,
        creditLimit: client.creditLimit
          ? this.convertDecimalToNumber(client.creditLimit)
          : undefined,
        totalRevenue: this.convertDecimalToNumber(client.totalRevenue),
        outstandingBalance: this.convertDecimalToNumber(client.outstandingBalance),
        averageInvoiceAmount: client.averageInvoiceAmount
          ? this.convertDecimalToNumber(client.averageInvoiceAmount)
          : undefined,
        website: undefined,
        isActive: client.status === 'active',
        metadata: client.customFields || {},
      } as any;

      // Send reminder
      const sent = await this.invoiceEmailService.sendPaymentReminder(
        invoiceForReminder,
        clientForReminder,
        DEFAULT_COMPANY_CONFIG,
        language || client.language
      );

      if (sent) {
        res.json({
          success: true,
          message: 'Payment reminder sent successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send payment reminder',
        });
      }
    } catch (error: any) {
      logger.error('Error sending payment reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send payment reminder',
      });
    }
  }

  /**
   * Get next invoice number
   * GET /api/financial/invoices/numbering/next
   */
  async getNextInvoiceNumber(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized
      await this.ensureSchemasInitialized();

      const { series, prefix, format, year } = req.query;

      const nextNumber = await this.invoiceNumberingService.getNextInvoiceNumber({
        series: series as string,
        prefix: prefix as string,
        format: format as string,
        year: year ? parseInt(year as string) : undefined,
      });

      res.json({
        success: true,
        data: {
          nextNumber,
          preview: `This will be your next invoice number: ${nextNumber}`,
        },
      });
    } catch (error: any) {
      logger.error('Error getting next invoice number:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get next invoice number',
      });
    }
  }

  /**
   * Get numbering sequences
   * GET /api/financial/invoices/numbering/sequences
   */
  async getNumberingSequences(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized
      await this.ensureSchemasInitialized();

      const sequences = await this.invoiceNumberingService.getAllSequences();
      const stats = await this.invoiceNumberingService.getStatistics();

      res.json({
        success: true,
        data: {
          sequences,
          statistics: stats,
        },
      });
    } catch (error: any) {
      logger.error('Error getting numbering sequences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get numbering sequences',
      });
    }
  }
}
