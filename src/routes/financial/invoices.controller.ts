import { Request, Response } from 'express';
import { InvoiceManagementService } from '../../services/financial/invoice-management.service';
import { logger } from '../../utils/log';
import { Invoice, InvoiceItem } from '../../models/financial/invoice.model';

export class InvoicesController {
  private invoiceService: InvoiceManagementService;

  constructor() {
    this.invoiceService = new InvoiceManagementService();
  }

  /**
   * Create a new invoice
   * POST /api/financial/invoices
   */
  async createInvoice(req: Request, res: Response): Promise<void> {
    try {
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
}