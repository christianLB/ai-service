import { Request, Response } from 'express';
import { InvoiceManagementService } from '../../services/financial/invoice-management.service';
import { InvoiceGenerationService } from '../../services/financial/invoice-generation.service';
import { InvoiceNumberingService } from '../../services/financial/invoice-numbering.service';
import { InvoiceStorageService } from '../../services/financial/invoice-storage.service';
import { getInvoiceEmailService } from '../../services/financial/invoice-email.service';
import { ClientManagementService } from '../../services/financial/client-management.service';
import { logger } from '../../utils/log';
import { Invoice, InvoiceItem } from '../../models/financial/invoice.model';
import { DEFAULT_COMPANY_CONFIG } from '../../models/financial/company.model';
import { db } from '../../services/database';

export class InvoicesController {
  private invoiceService: InvoiceManagementService;
  private invoiceGenerationService: InvoiceGenerationService;
  private invoiceNumberingService: InvoiceNumberingService;
  private invoiceStorageService: InvoiceStorageService;
  private invoiceEmailService: ReturnType<typeof getInvoiceEmailService>;
  private clientService: ClientManagementService;
  private schemasInitialized = false;

  constructor() {
    this.invoiceService = new InvoiceManagementService();
    this.invoiceGenerationService = new InvoiceGenerationService();
    this.clientService = new ClientManagementService();
    this.invoiceEmailService = getInvoiceEmailService();
    
    // Use the existing database pool instead of creating a new one
    this.invoiceNumberingService = new InvoiceNumberingService(db.pool);
    this.invoiceStorageService = new InvoiceStorageService(db.pool);
    
    // Schema initialization will be done lazily when needed
  }

  private async initializeSchemasAsync(): Promise<void> {
    // Avoid multiple initialization attempts
    if (this.schemasInitialized) return;
    
    try {
      logger.info('Initializing invoice schemas...');
      await this.invoiceNumberingService.initializeSchema();
      await this.invoiceStorageService.initializeSchema();
      this.schemasInitialized = true;
      logger.info('Invoice schemas initialized successfully');
    } catch (error) {
      logger.error('Error initializing invoice schemas:', error);
      throw error; // Let the caller handle the error
    }
  }

  private async ensureSchemasInitialized(): Promise<void> {
    // Initialize schemas on first use
    if (!this.schemasInitialized) {
      try {
        await this.initializeSchemasAsync();
      } catch (error) {
        logger.error('Failed to initialize schemas on demand:', error);
        // Continue anyway - the database might already have the schemas
      }
    }
  }

  /**
   * Create a new invoice
   * POST /api/financial/invoices
   */
  async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized
      await this.ensureSchemasInitialized();
      
      const invoiceData: Partial<Invoice> = req.body;

      // Validate required fields
      if (!invoiceData.clientId || !invoiceData.items || invoiceData.items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: clientId, items'
        });
        return;
      }

      const invoice = await this.invoiceService.createInvoice(invoiceData);

      res.status(201).json({
        success: true,
        data: { invoice },
        message: 'Invoice created successfully'
      });

    } catch (error: any) {
      logger.error('Error creating invoice:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create invoice'
        });
      }
    }
  }

  /**
   * Get invoice by ID
   * GET /api/financial/invoices/:id
   */
  async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await this.invoiceService.getInvoice(id);

      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { invoice }
      });

    } catch (error: any) {
      logger.error('Error getting invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get invoice'
      });
    }
  }

  /**
   * Get invoice by invoice number
   * GET /api/financial/invoices/number/:invoiceNumber
   */
  async getInvoiceByNumber(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceNumber } = req.params;
      const invoice = await this.invoiceService.getInvoiceByNumber(invoiceNumber);

      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { invoice }
      });

    } catch (error: any) {
      logger.error('Error getting invoice by number:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get invoice'
      });
    }
  }

  /**
   * Update invoice
   * PUT /api/financial/invoices/:id
   */
  async updateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: Partial<Invoice> = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.invoiceNumber;
      delete updates.clientName;
      delete updates.clientTaxId;
      delete updates.createdAt;
      delete updates.updatedAt;

      const invoice = await this.invoiceService.updateInvoice(id, updates);

      res.json({
        success: true,
        data: { invoice },
        message: 'Invoice updated successfully'
      });

    } catch (error: any) {
      logger.error('Error updating invoice:', error);
      
      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      } else if (error.message.includes('Cannot modify')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update invoice'
        });
      }
    }
  }

  /**
   * List invoices with filters
   * GET /api/financial/invoices
   */
  async listInvoices(req: Request, res: Response): Promise<void> {
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
        sortOrder = 'DESC'
      } = req.query;

      const options = {
        clientId: clientId as string,
        status: status as string,
        type: type as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      };

      const result = await this.invoiceService.listInvoices(options);

      res.json({
        success: true,
        data: {
          invoices: result.invoices,
          pagination: {
            total: result.total,
            limit: options.limit,
            offset: options.offset,
            hasMore: result.total > (options.offset + options.limit)
          }
        }
      });

    } catch (error: any) {
      logger.error('Error listing invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list invoices'
      });
    }
  }

  /**
   * Get overdue invoices
   * GET /api/financial/invoices/overdue
   */
  async getOverdueInvoices(req: Request, res: Response): Promise<void> {
    try {
      const overdueInvoices = await this.invoiceService.getOverdueInvoices();

      res.json({
        success: true,
        data: {
          invoices: overdueInvoices,
          count: overdueInvoices.length
        }
      });

    } catch (error: any) {
      logger.error('Error getting overdue invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get overdue invoices'
      });
    }
  }

  /**
   * Mark invoice as paid
   * POST /api/financial/invoices/:id/mark-paid
   */
  async markAsPaid(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { paidDate, paymentReference } = req.body;

      const invoice = await this.invoiceService.markAsPaid(
        id,
        paidDate ? new Date(paidDate) : undefined,
        paymentReference
      );

      res.json({
        success: true,
        data: { invoice },
        message: 'Invoice marked as paid successfully'
      });

    } catch (error: any) {
      logger.error('Error marking invoice as paid:', error);
      
      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to mark invoice as paid'
        });
      }
    }
  }

  /**
   * Add item to invoice
   * POST /api/financial/invoices/:id/items
   */
  async addItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item: InvoiceItem = req.body;

      // Validate item
      if (!item.description || !item.quantity || !item.unitPrice) {
        res.status(400).json({
          success: false,
          error: 'Missing required item fields: description, quantity, unitPrice'
        });
        return;
      }

      const invoice = await this.invoiceService.addItem(id, item);

      res.json({
        success: true,
        data: { invoice },
        message: 'Item added to invoice successfully'
      });

    } catch (error: any) {
      logger.error('Error adding item to invoice:', error);
      
      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      } else if (error.message.includes('Cannot modify')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to add item to invoice'
        });
      }
    }
  }

  /**
   * Attach document to invoice
   * POST /api/financial/invoices/:id/attachments
   */
  async attachDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, documentId, fileName, description } = req.body;

      if (!type || !documentId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: type, documentId'
        });
        return;
      }

      const invoice = await this.invoiceService.attachDocument(id, {
        type,
        documentId,
        fileName,
        description
      });

      res.json({
        success: true,
        data: { invoice },
        message: 'Document attached to invoice successfully'
      });

    } catch (error: any) {
      logger.error('Error attaching document to invoice:', error);
      
      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to attach document to invoice'
        });
      }
    }
  }

  /**
   * Get client invoice statistics
   * GET /api/financial/invoices/stats/client/:clientId
   */
  async getClientInvoiceStats(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;
      const stats = await this.invoiceService.getClientInvoiceStats(clientId);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error: any) {
      logger.error('Error getting client invoice stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get client invoice statistics'
      });
    }
  }

  /**
   * Delete invoice (cancel)
   * DELETE /api/financial/invoices/:id
   */
  async deleteInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.invoiceService.deleteInvoice(id);

      res.json({
        success: true,
        message: 'Invoice cancelled successfully'
      });

    } catch (error: any) {
      logger.error('Error deleting invoice:', error);
      
      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      } else if (error.message.includes('Cannot delete')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete invoice'
        });
      }
    }
  }

  /**
   * Send invoice (mark as sent and update sent_at)
   * POST /api/financial/invoices/:id/send
   */
  async sendInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sendMethod = 'email', recipients } = req.body;

      // Update invoice status to sent
      const invoice = await this.invoiceService.updateInvoice(id, {
        status: 'sent'
      });

      // TODO: Here would be the actual sending logic (email, Telegram, etc.)
      // For now, we just update the status

      res.json({
        success: true,
        data: { 
          invoice,
          sendMethod,
          recipients
        },
        message: 'Invoice sent successfully'
      });

    } catch (error: any) {
      logger.error('Error sending invoice:', error);
      
      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send invoice'
        });
      }
    }
  }

  /**
   * Duplicate invoice (create copy with new number)
   * POST /api/financial/invoices/:id/duplicate
   */
  async duplicateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const originalInvoice = await this.invoiceService.getInvoice(id);

      if (!originalInvoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }

      // Create new invoice based on original
      const duplicateData: Partial<Invoice> = {
        clientId: originalInvoice.clientId,
        type: originalInvoice.type,
        items: originalInvoice.items,
        currency: originalInvoice.currency,
        taxRate: originalInvoice.taxRate,
        taxType: originalInvoice.taxType,
        paymentTerms: originalInvoice.paymentTerms,
        paymentMethod: originalInvoice.paymentMethod,
        bankAccount: originalInvoice.bankAccount,
        termsAndConditions: originalInvoice.termsAndConditions,
        notes: originalInvoice.notes,
        tags: originalInvoice.tags,
        isDeductible: originalInvoice.isDeductible,
        deductibleCategory: originalInvoice.deductibleCategory,
        deductiblePercentage: originalInvoice.deductiblePercentage
      };

      const newInvoice = await this.invoiceService.createInvoice(duplicateData);

      res.status(201).json({
        success: true,
        data: { invoice: newInvoice },
        message: `Invoice duplicated from ${originalInvoice.invoiceNumber}`
      });

    } catch (error: any) {
      logger.error('Error duplicating invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to duplicate invoice'
      });
    }
  }

  /**
   * Generate PDF for invoice
   * POST /api/financial/invoices/:id/generate-pdf
   */
  async generatePDF(req: Request, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized for storage
      await this.ensureSchemasInitialized();
      
      const { id } = req.params;
      const { language, showStatus = true, generateQR = true } = req.body;

      // Get invoice and client
      const invoice = await this.invoiceService.getInvoice(id);
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }

      const client = await this.clientService.getClient(invoice.clientId);
      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
        return;
      }

      // Generate PDF
      const result = await this.invoiceGenerationService.generateInvoicePDF({
        invoice,
        client,
        company: DEFAULT_COMPANY_CONFIG,
        language: language || client.language,
        showStatus,
        generateQR
      });

      // Store PDF
      const stored = await this.invoiceStorageService.storeInvoice(
        invoice.id,
        invoice.invoiceNumber,
        result.pdfBuffer,
        result.fileName,
        { generatePublicUrl: true }
      );

      // Update invoice with PDF URL
      await this.invoiceService.updateInvoice(id, {
        pdfUrl: stored.url
      });

      res.json({
        success: true,
        data: {
          fileName: result.fileName,
          fileSize: stored.fileSize,
          url: stored.url,
          storedAt: stored.createdAt
        },
        message: 'Invoice PDF generated successfully'
      });

    } catch (error: any) {
      logger.error('Error generating invoice PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate invoice PDF'
      });
    }
  }

  /**
   * Download invoice PDF
   * GET /api/financial/invoices/:id/download-pdf
   */
  async downloadPDF(req: Request, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized for storage
      await this.ensureSchemasInitialized();
      
      const { id } = req.params;

      // Retrieve stored PDF
      const result = await this.invoiceStorageService.retrieveInvoice(id);
      
      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Invoice PDF not found'
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
        error: 'Failed to download invoice PDF'
      });
    }
  }

  /**
   * Preview invoice HTML
   * GET /api/financial/invoices/:id/preview
   */
  async previewInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { language } = req.query;

      // Get invoice and client
      const invoice = await this.invoiceService.getInvoice(id);
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }

      const client = await this.clientService.getClient(invoice.clientId);
      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
        return;
      }

      // Generate HTML preview
      const html = await this.invoiceGenerationService.previewInvoiceHTML({
        invoice,
        client,
        company: DEFAULT_COMPANY_CONFIG,
        language: (language as string) || client.language,
        showStatus: true,
        generateQR: true
      });

      // Send HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);

    } catch (error: any) {
      logger.error('Error previewing invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to preview invoice'
      });
    }
  }

  /**
   * Send invoice by email
   * POST /api/financial/invoices/:id/send-email
   */
  async sendInvoiceEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        subject,
        message,
        cc,
        bcc,
        language
      } = req.body;

      // Get invoice and client
      const invoice = await this.invoiceService.getInvoice(id);
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }

      const client = await this.clientService.getClient(invoice.clientId);
      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
        return;
      }

      // Generate PDF if not already generated
      let pdfBuffer: Buffer;
      const existingPdf = await this.invoiceStorageService.retrieveInvoice(id);
      
      if (existingPdf) {
        pdfBuffer = existingPdf.buffer;
      } else {
        const result = await this.invoiceGenerationService.generateInvoicePDF({
          invoice,
          client,
          company: DEFAULT_COMPANY_CONFIG,
          language: language || client.language
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
        invoice,
        client,
        company: DEFAULT_COMPANY_CONFIG,
        pdfBuffer,
        language: language || client.language,
        subject,
        message,
        cc,
        bcc
      });

      if (sent) {
        // Update invoice status
        await this.invoiceService.updateInvoice(id, {
          status: 'sent',
          sentAt: new Date()
        });

        res.json({
          success: true,
          message: 'Invoice sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send invoice email'
        });
      }

    } catch (error: any) {
      logger.error('Error sending invoice email:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send invoice email'
      });
    }
  }

  /**
   * Send payment reminder
   * POST /api/financial/invoices/:id/send-reminder
   */
  async sendPaymentReminder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { language } = req.body;

      // Get invoice and client
      const invoice = await this.invoiceService.getInvoice(id);
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }

      if (invoice.status === 'paid') {
        res.status(400).json({
          success: false,
          error: 'Invoice is already paid'
        });
        return;
      }

      const client = await this.clientService.getClient(invoice.clientId);
      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
        return;
      }

      // Send reminder
      const sent = await this.invoiceEmailService.sendPaymentReminder(
        invoice,
        client,
        DEFAULT_COMPANY_CONFIG,
        language || client.language
      );

      if (sent) {
        res.json({
          success: true,
          message: 'Payment reminder sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send payment reminder'
        });
      }

    } catch (error: any) {
      logger.error('Error sending payment reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send payment reminder'
      });
    }
  }

  /**
   * Get next invoice number
   * GET /api/financial/invoices/numbering/next
   */
  async getNextInvoiceNumber(req: Request, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized
      await this.ensureSchemasInitialized();
      
      const { series, prefix, format, year } = req.query;

      const nextNumber = await this.invoiceNumberingService.getNextInvoiceNumber({
        series: series as string,
        prefix: prefix as string,
        format: format as string,
        year: year ? parseInt(year as string) : undefined
      });

      res.json({
        success: true,
        data: {
          nextNumber,
          preview: `This will be your next invoice number: ${nextNumber}`
        }
      });

    } catch (error: any) {
      logger.error('Error getting next invoice number:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get next invoice number'
      });
    }
  }

  /**
   * Get numbering sequences
   * GET /api/financial/invoices/numbering/sequences
   */
  async getNumberingSequences(req: Request, res: Response): Promise<void> {
    try {
      // Ensure schemas are initialized
      await this.ensureSchemasInitialized();
      
      const sequences = await this.invoiceNumberingService.getAllSequences();
      const stats = await this.invoiceNumberingService.getStatistics();

      res.json({
        success: true,
        data: {
          sequences,
          statistics: stats
        }
      });

    } catch (error: any) {
      logger.error('Error getting numbering sequences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get numbering sequences'
      });
    }
  }
}