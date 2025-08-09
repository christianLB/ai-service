import { createExpressEndpoints } from '@ts-rest/express';
import { apiContract } from '../../packages/contracts/src';
import { PrismaClient } from '@prisma/client';
import { Express } from 'express';
import { logger } from '../utils/log';
import { InvoiceAttachmentService } from '../services/financial/invoice-attachment.service';
import { ClientService } from '../services/financial/client.service';
import { InvoiceService } from '../services/financial/invoice.service';
import { DashboardContractService } from '../services/dashboard/dashboard-contract.service';

const prisma = new PrismaClient();

// Initialize services
const attachmentService = new InvoiceAttachmentService(prisma, {
  baseDir: process.env.ATTACHMENTS_DIR || undefined,
});
const dashboardService = new DashboardContractService(prisma);

// Create the ts-rest router implementation
export function setupContractRoutes(app: Express) {
  createExpressEndpoints(apiContract, {
    // Financial endpoints
    financial: {
      listAccounts: async ({ query }) => {
        try {
          // TODO: Implement with GoCardless service
          return {
            status: 200,
            body: { accounts: [], total: 0 },
          };
        } catch (error) {
          logger.error('Failed to list accounts', error);
          return {
            status: 500,
            body: { accounts: [], total: 0 },
          };
        }
      },

      listAttachments: async ({ params, query }) => {
        try {
          const userId = query.userId || 'anonymous';
          const attachments = await attachmentService.getInvoiceAttachments(
            params.invoiceId,
            userId
          );
          // Convert Date objects to strings for the contract
          const formattedAttachments = attachments.map(att => ({
            ...att,
            uploadedAt: att.uploadedAt instanceof Date ? att.uploadedAt.toISOString() : att.uploadedAt,
          }));
          return {
            status: 200,
            body: { attachments: formattedAttachments, total: formattedAttachments.length },
          };
        } catch (error) {
          logger.error('Failed to list attachments', error);
          return {
            status: 500,
            body: { error: 'Failed to get attachments' },
          };
        }
      },

      uploadAttachment: async ({ params, body }) => {
        try {
          // TODO: Handle multipart/form-data properly
          return {
            status: 400,
            body: { error: 'Not implemented yet' },
          };
        } catch (error) {
          logger.error('Failed to upload attachment', error);
          return {
            status: 500,
            body: { error: 'Failed to upload attachment' },
          };
        }
      },

      downloadAttachment: async ({ params, query }) => {
        try {
          const userId = query.userId || 'anonymous';
          const result = await attachmentService.downloadAttachment(
            params.id,
            userId
          );
          if (!result) {
            return {
              status: 404,
              body: { error: 'Attachment not found' },
            };
          }
          return {
            status: 200,
            body: result.buffer,
          };
        } catch (error) {
          logger.error('Failed to download attachment', error);
          return {
            status: 500,
            body: { error: 'Failed to download attachment' },
          };
        }
      },

      health: async () => {
        try {
          // Check database connection
          await prisma.$queryRaw`SELECT 1`;
          
          return {
            status: 200,
            body: {
              success: true,
              status: 'healthy' as const,
              services: {
                database: 'healthy' as const,
                gocardless: 'unknown' as const, // TODO: Check GoCardless
                scheduler: 'unknown' as const, // TODO: Check scheduler
              },
              timestamp: new Date().toISOString(),
            },
          };
        } catch (error) {
          logger.error('Health check failed', error);
          return {
            status: 500,
            body: { error: 'Health check failed' },
          };
        }
      },
    },

    // Dashboard endpoints
    dashboard: {
      health: async () => {
        try {
          // Check database connection
          await prisma.$queryRaw`SELECT 1`;
          
          return {
            status: 200,
            body: {
              success: true,
              status: 'healthy' as const,
              services: {
                database: 'healthy' as const,
                gocardless: 'unknown' as const,
                scheduler: 'unknown' as const,
              },
              timestamp: new Date().toISOString(),
            },
          };
        } catch (error) {
          logger.error('Dashboard health check failed', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Health check failed',
            },
          };
        }
      },

      clientMetrics: async () => {
        try {
          const metrics = await dashboardService.getClientMetrics();
          return {
            status: 200,
            body: metrics,
          };
        } catch (error) {
          logger.error('Failed to get client metrics', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to get client metrics',
            },
          };
        }
      },

      revenueMetrics: async ({ query }) => {
        try {
          const metrics = await dashboardService.getRevenueMetrics();
          return {
            status: 200,
            body: metrics,
          };
        } catch (error) {
          logger.error('Failed to get revenue metrics', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to get revenue metrics',
            },
          };
        }
      },

      invoiceStatistics: async () => {
        try {
          const stats = await dashboardService.getInvoiceStatistics();
          return {
            status: 200,
            body: stats,
          };
        } catch (error) {
          logger.error('Failed to get invoice statistics', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to get invoice statistics',
            },
          };
        }
      },

      cashFlowProjections: async ({ query }) => {
        try {
          const projections = await dashboardService.getCashFlowProjections();
          return {
            status: 200,
            body: projections,
          };
        } catch (error) {
          logger.error('Failed to get cash flow projections', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to get cash flow projections',
            },
          };
        }
      },

      syncStatus: async () => {
        try {
          const syncStatus = await dashboardService.getSyncStatus();
          return {
            status: 200,
            body: syncStatus,
          };
        } catch (error) {
          logger.error('Failed to get sync status', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to get sync status',
            },
          };
        }
      },

      accountStatus: async () => {
        try {
          const accountStatus = await dashboardService.getAccountStatus();
          return {
            status: 200,
            body: accountStatus,
          };
        } catch (error) {
          logger.error('Failed to get account status', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to get account status',
            },
          };
        }
      },

      quickStats: async () => {
        try {
          const quickStats = await dashboardService.getQuickStats();
          return {
            status: 200,
            body: quickStats,
          };
        } catch (error) {
          logger.error('Failed to get quick stats', error);
          return {
            status: 500,
            body: {
              success: false,
              error: 'Failed to get quick stats',
            },
          };
        }
      },
    },
  }, app);

  logger.info('Contract routes initialized with ts-rest');
}