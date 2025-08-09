import { createExpressEndpoints } from '@ts-rest/express';
import { Express } from 'express';
import { entityTagContract } from '../../packages/contracts/src/contracts/entity-tag';
import { EntityTagService } from '../services/tagging/entity-tag.service';
import { logger } from '../utils/log';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const service = new EntityTagService(prisma);

export function setupEntityTagRoutes(app: Express) {
  createExpressEndpoints(entityTagContract, {
    // Get all entitytags
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
        logger.error('Error fetching entitytags:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to fetch entitytags',
          },
        };
      }
    },

    // Get entitytag by ID
    getById: async ({ params, query }) => {
      try {
        const result = await service.findById(params.id, query?.include);
        
        if (!result) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'EntityTag not found',
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
        logger.error('Error fetching entitytag:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to fetch entitytag',
          },
        };
      }
    },

    // Create new entitytag
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
        logger.error('Error creating entitytag:', error);
        
        if (error.code === 'P2002') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'A entitytag with this data already exists',
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
            error: 'Failed to create entitytag',
          },
        };
      }
    },

    // Update entitytag
    update: async ({ params, body }) => {
      try {
        const result = await service.update(params.id, body);

        if (!result) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'EntityTag not found',
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
        logger.error('Error updating entitytag:', error);

        if (error.code === 'P2002') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'A entitytag with this data already exists',
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
            error: 'Failed to update entitytag',
          },
        };
      }
    },

    // Delete entitytag
    delete: async ({ params }) => {
      try {
        const success = await service.delete(params.id);

        if (!success) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'EntityTag not found',
            },
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            message: 'EntityTag deleted successfully',
          },
        };
      } catch (error: any) {
        logger.error('Error deleting entitytag:', error);

        if (error.code === 'P2003') {
          return {
            status: 400,
            body: {
              success: false,
              error: 'Cannot delete entitytag due to existing references',
            },
          };
        }

        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to delete entitytag',
          },
        };
      }
    },

    // Bulk create entitytags
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
        logger.error('Error bulk creating entitytags:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk create entitytags',
          },
        };
      }
    },

    // Bulk update entitytags
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
        logger.error('Error bulk updating entitytags:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk update entitytags',
          },
        };
      }
    },

    // Bulk delete entitytags
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
        logger.error('Error bulk deleting entitytags:', error);
        return {
          status: 500,
          body: {
            success: false,
            error: 'Failed to bulk delete entitytags',
          },
        };
      }
    },
  }, app);

  logger.info('EntityTag routes initialized with ts-rest');
}