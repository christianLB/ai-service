import { createExpressEndpoints } from '@ts-rest/express';
import { Express } from 'express';
import { invoiceAttachmentContract } from '../../packages/contracts/src/contracts/invoice-attachment';
import { InvoiceAttachmentService as GeneratedInvoiceAttachmentService } from '../services/financial/invoice-attachment-generated.service';
import { logger } from '../utils/log';

const service = new GeneratedInvoiceAttachmentService();

export function setupInvoiceAttachmentRoutes(app: Express) {
  createExpressEndpoints(
    invoiceAttachmentContract,
    {
      // Get all invoiceattachments
      getAll: async ({ query }) => {
        try {
          const { page = 1, limit = 20, sortBy, sortOrder, search } = query as any;
          const result = await service.getAll({ page, limit, sortBy, sortOrder, search } as any);

          return {
            status: 200,
            body: {
              success: true,
              data: (result as any).items,
              pagination: {
                total: (result as any).total,
                page,
                limit,
                totalPages: Math.ceil((result as any).total / limit),
              },
            },
          };
        } catch (error) {
          logger.error('Error fetching invoiceattachments:', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to fetch invoiceattachments',
            },
          };
        }
      },

      // Get invoiceattachment by ID
      getById: async ({ params }) => {
        try {
          const result = await service.getById(params.id);

          if (!result) {
            return {
              status: 404,
              body: {
                success: false,
                error: 'InvoiceAttachment not found',
              },
            };
          }

          return {
            status: 200,
            body: {
              success: true,
              data: result,
            },
          };
        } catch (error) {
          logger.error('Error fetching invoiceattachment:', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to fetch invoiceattachment',
            },
          };
        }
      },

      // Create new invoiceattachment
      create: async ({ body }) => {
        try {
          const result = await service.create(body as any);

          return {
            status: 201,
            body: {
              success: true,
              data: result,
            },
          };
        } catch (error: any) {
          logger.error('Error creating invoiceattachment:', error);

          if (error.code === 'P2002') {
            return {
              status: 400,
              body: {
                success: false,
                error: 'A invoiceattachment with this data already exists',
              },
            };
          }

          if (error.name === 'ValidationError' || error.code === 'P2003') {
            return {
              status: 400,
              body: {
                success: false,
                error: error.message || 'Validation failed',
              },
            };
          }

          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to create invoiceattachment',
            },
          };
        }
      },

      // Update invoiceattachment
      update: async ({ params, body }) => {
        try {
          const result = await service.update(params.id, body as any);

          if (!result) {
            return {
              status: 404,
              body: {
                success: false,
                error: 'InvoiceAttachment not found',
              },
            };
          }

          return {
            status: 200,
            body: {
              success: true,
              data: result,
            },
          };
        } catch (error: any) {
          logger.error('Error updating invoiceattachment:', error);

          if (error.code === 'P2002') {
            return {
              status: 400,
              body: {
                success: false,
                error: 'A invoiceattachment with this data already exists',
              },
            };
          }

          if (error.name === 'ValidationError' || error.code === 'P2003') {
            return {
              status: 400,
              body: {
                success: false,
                error: error.message || 'Validation failed',
              },
            };
          }

          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to update invoiceattachment',
            },
          };
        }
      },

      // Delete invoiceattachment
      delete: async ({ params }) => {
        try {
          await service.delete(params.id);

          return {
            status: 200,
            body: {
              success: true,
              message: 'InvoiceAttachment deleted successfully',
            },
          };
        } catch (error: any) {
          logger.error('Error deleting invoiceattachment:', error);

          if (error.code === 'P2003') {
            return {
              status: 400,
              body: {
                success: false,
                error: 'Cannot delete invoiceattachment due to existing references',
              },
            };
          }

          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to delete invoiceattachment',
            },
          };
        }
      },

      // Bulk create/update/delete not implemented
      bulkCreate: async () =>
        ({ status: 501, body: { success: false, error: 'Not implemented' } }) as any,
      bulkUpdate: async () =>
        ({ status: 501, body: { success: false, error: 'Not implemented' } }) as any,
      bulkDelete: async () =>
        ({ status: 501, body: { success: false, error: 'Not implemented' } }) as any,
    },
    app as any
  );

  logger.info('InvoiceAttachment routes initialized with ts-rest');
}
