import { createExpressEndpoints } from '@ts-rest/express';
import { Express } from 'express';
import { marketDataContract } from '../../packages/contracts/src/contracts/market-data';
import { MarketDataService } from '../services/public/market-data.service';
import { logger } from '../utils/log';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const service = new MarketDataService(prisma);

export function setupMarketDataRoutes(app: Express) {
  createExpressEndpoints(marketDataContract, {
    // Get all marketdatas
    getAll: async ({ query }) => {
      try {
        const { page = 1, limit = 20, sortBy, sortOrder, search, include, ...filters } = query;
        
        const result = await service.findAll({
          page,
          limit,
          sortBy,
          sortOrder,
          search,
          include,
          filters,
        });

        return {
          status: 200,
          body: {
            success: true,
            data: result.data,
            pagination: {
              total: result.total,
              page,
              limit,
              totalPages: Math.ceil(result.total / limit),
            },
          },
        };
      } catch (error) {
        logger.error('Error fetching marketdatas:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to fetch marketdatas',
          },
        };
      }
    },

    // Get marketdata by ID
    getById: async ({ params, query }) => {
      try {
        const result = await service.findById(params.id, query?.include);
        
        if (!result) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'MarketData not found',
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
        logger.error('Error fetching marketdata:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to fetch marketdata',
          },
        };
      }
    },

    // Create new marketdata
    create: async ({ body }) => {
      try {
        const result = await service.create(body);

        return {
          status: 201,
          body: {
            success: true,
            data: result,
          },
        };
      } catch (error: any) {
        logger.error('Error creating marketdata:', error);
        
        if (error.code === 'P2002') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'A marketdata with this data already exists',
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
            error: 'Failed to create marketdata',
          },
        };
      }
    },

    // Update marketdata
    update: async ({ params, body }) => {
      try {
        const result = await service.update(params.id, body);

        if (!result) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'MarketData not found',
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
        logger.error('Error updating marketdata:', error);

        if (error.code === 'P2002') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'A marketdata with this data already exists',
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
            error: 'Failed to update marketdata',
          },
        };
      }
    },

    // Delete marketdata
    delete: async ({ params }) => {
      try {
        const success = await service.delete(params.id);

        if (!success) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'MarketData not found',
            },
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            message: 'MarketData deleted successfully',
          },
        };
      } catch (error: any) {
        logger.error('Error deleting marketdata:', error);

        if (error.code === 'P2003') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'Cannot delete marketdata due to existing references',
            },
          };
        }

        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to delete marketdata',
          },
        };
      }
    },

    // Bulk create marketdatas
    bulkCreate: async ({ body }) => {
      try {
        const result = await service.bulkCreate(body.data);

        return {
          status: 201,
          body: {
            success: true,
            data: result,
            count: result.length,
          },
        };
      } catch (error) {
        logger.error('Error bulk creating marketdatas:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk create marketdatas',
          },
        };
      }
    },

    // Bulk update marketdatas
    bulkUpdate: async ({ body }) => {
      try {
        const count = await service.bulkUpdate(body.where, body.data);

        return {
          status: 200,
          body: {
            success: true,
            count,
          },
        };
      } catch (error) {
        logger.error('Error bulk updating marketdatas:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk update marketdatas',
          },
        };
      }
    },

    // Bulk delete marketdatas
    bulkDelete: async ({ body }) => {
      try {
        const count = await service.bulkDelete(body.ids);

        return {
          status: 200,
          body: {
            success: true,
            count,
          },
        };
      } catch (error) {
        logger.error('Error bulk deleting marketdatas:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk delete marketdatas',
          },
        };
      }
    },
  }, app);

  logger.info('MarketData routes initialized with ts-rest');
}