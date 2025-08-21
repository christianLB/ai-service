import { Request, Response } from 'express';
import { invoiceTemplateService } from '../../services/invoice-template.service';
import {
  createInvoiceTemplateSchema,
  updateInvoiceTemplateSchema,
  invoiceTemplateQuerySchema,
} from '../../types/invoice-template.types';
import logger from '../../utils/logger';

export class InvoiceTemplatesController {
  /**
   * Get all invoice templates with pagination
   */
  async getInvoiceTemplates(req: Request, res: Response) {
    try {
      const query = invoiceTemplateQuerySchema.parse(req.query);
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const result = await invoiceTemplateService.getAll(query, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error fetching invoice templates:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch invoice templates',
      });
    }
  }

  /**
   * Get a single invoice template by ID
   */
  async getInvoiceTemplateById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const template = await invoiceTemplateService.getById(id, userId);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Invoice template not found',
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      logger.error('Error fetching invoice template:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch invoice template',
      });
    }
  }

  /**
   * Create a new invoice template
   */
  async createInvoiceTemplate(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const bodyData = { ...req.body };

      // Ensure userId is set
      if (!bodyData.userId && userId) {
        bodyData.userId = userId;
      }

      const data = createInvoiceTemplateSchema.parse(bodyData);

      const template = await invoiceTemplateService.create(data, userId);

      res.status(201).json({
        success: true,
        data: template,
        message: 'Invoice template created successfully',
      });
    } catch (error: any) {
      logger.error('Error creating invoice template:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create invoice template',
      });
    }
  }

  /**
   * Update an invoice template
   */
  async updateInvoiceTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const data = updateInvoiceTemplateSchema.parse({ id, ...req.body });

      const template = await invoiceTemplateService.update(id, data, userId);

      res.json({
        success: true,
        data: template,
        message: 'Invoice template updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating invoice template:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update invoice template',
      });
    }
  }

  /**
   * Delete an invoice template
   */
  async deleteInvoiceTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      await invoiceTemplateService.delete(id, userId);

      res.json({
        success: true,
        message: 'Invoice template deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting invoice template:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete invoice template',
      });
    }
  }
}
