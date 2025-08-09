import { createExpressEndpoints } from '@ts-rest/express';
import { Express } from 'express';
import { universalTagContract } from '../../packages/contracts/src/contracts/universal-tag';
import { UniversalTagService } from '../services/tagging/universal-tag.service';
import { logger } from '../utils/log';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const service = new UniversalTagService(prisma);

export function setupUniversalTagRoutes(app: Express) {
  createExpressEndpoints(universalTagContract, {
    // Get all universaltags
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
        logger.error('Error fetching universaltags:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to fetch universaltags',
          },
        };
      }
    },

    // Get universaltag by ID
    getById: async ({ params, query }) => {
      try {
        const result = await service.findById(params.id, query?.include);
        
        if (!result) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'UniversalTag not found',
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
        logger.error('Error fetching universaltag:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to fetch universaltag',
          },
        };
      }
    },

    // Create new universaltag
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
        logger.error('Error creating universaltag:', error);
        
        if (error.code === 'P2002') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'A universaltag with this data already exists',
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
            error: 'Failed to create universaltag',
          },
        };
      }
    },

    // Update universaltag
    update: async ({ params, body }) => {
      try {
        const result = await service.update(params.id, body);

        if (!result) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'UniversalTag not found',
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
        logger.error('Error updating universaltag:', error);

        if (error.code === 'P2002') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'A universaltag with this data already exists',
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
            error: 'Failed to update universaltag',
          },
        };
      }
    },

    // Delete universaltag
    delete: async ({ params }) => {
      try {
        const success = await service.delete(params.id);

        if (!success) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'UniversalTag not found',
            },
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            message: 'UniversalTag deleted successfully',
          },
        };
      } catch (error: any) {
        logger.error('Error deleting universaltag:', error);

        if (error.code === 'P2003') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'Cannot delete universaltag due to existing references',
            },
          };
        }

        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to delete universaltag',
          },
        };
      }
    },

    // Bulk create universaltags
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
        logger.error('Error bulk creating universaltags:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk create universaltags',
          },
        };
      }
    },

    // Bulk update universaltags
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
        logger.error('Error bulk updating universaltags:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk update universaltags',
          },
        };
      }
    },

    // Bulk delete universaltags
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
        logger.error('Error bulk deleting universaltags:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk delete universaltags',
          },
        };
      }
    },
  }, app);

  logger.info('UniversalTag routes initialized with ts-rest');
}