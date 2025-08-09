import { createExpressEndpoints } from '@ts-rest/express';
import { Express } from 'express';
import { strategyContract } from '../../packages/contracts/src/contracts/strategy';
import { StrategyService } from '../services/public/strategy.service';
import { logger } from '../utils/log';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const service = new StrategyService(prisma);

export function setupStrategyRoutes(app: Express) {
  createExpressEndpoints(strategyContract, {
    // Get all strategys
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
        logger.error('Error fetching strategys:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to fetch strategys',
          },
        };
      }
    },

    // Get strategy by ID
    getById: async ({ params, query }) => {
      try {
        const result = await service.findById(params.id, query?.include);
        
        if (!result) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Strategy not found',
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
        logger.error('Error fetching strategy:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to fetch strategy',
          },
        };
      }
    },

    // Create new strategy
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
        logger.error('Error creating strategy:', error);
        
        if (error.code === 'P2002') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'A strategy with this data already exists',
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
            error: 'Failed to create strategy',
          },
        };
      }
    },

    // Update strategy
    update: async ({ params, body }) => {
      try {
        const result = await service.update(params.id, body);

        if (!result) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Strategy not found',
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
        logger.error('Error updating strategy:', error);

        if (error.code === 'P2002') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'A strategy with this data already exists',
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
            error: 'Failed to update strategy',
          },
        };
      }
    },

    // Delete strategy
    delete: async ({ params }) => {
      try {
        const success = await service.delete(params.id);

        if (!success) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Strategy not found',
            },
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            message: 'Strategy deleted successfully',
          },
        };
      } catch (error: any) {
        logger.error('Error deleting strategy:', error);

        if (error.code === 'P2003') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'Cannot delete strategy due to existing references',
            },
          };
        }

        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to delete strategy',
          },
        };
      }
    },

    // Bulk create strategys
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
        logger.error('Error bulk creating strategys:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk create strategys',
          },
        };
      }
    },

    // Bulk update strategys
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
        logger.error('Error bulk updating strategys:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk update strategys',
          },
        };
      }
    },

    // Bulk delete strategys
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
        logger.error('Error bulk deleting strategys:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk delete strategys',
          },
        };
      }
    },
  }, app);

  logger.info('Strategy routes initialized with ts-rest');
}