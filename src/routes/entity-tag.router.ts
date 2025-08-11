import { createExpressEndpoints } from '@ts-rest/express';
import { Express } from 'express';
import { entityTagContract } from '../../packages/contracts/src/contracts/entity-tag';
import type { EntityTagResponse } from '../../packages/contracts/src/schemas/entity-tag';
import { entityTagService as service } from '../services/tagging/entity-tag.service';
import { logger } from '../utils/log';

export function setupEntityTagRoutes(app: Express) {
  // Normalize DB nulls to undefined for optional fields to satisfy contract
  const normalize = (r: any): EntityTagResponse => {
    const o: any = { ...r };
    const optionalKeys = [
      'appliedBy',
      'aiProvider',
      'aiModel',
      'aiResponse',
      'aiReasoning',
      'verifiedBy',
      'verifiedAt',
      'feedback',
      'isCorrect',
      'sourceEntityType',
      'sourceEntityId',
      'relationshipType',
    ];
    for (const k of optionalKeys) {
      if (o[k] === null) {
        o[k] = undefined;
      }
    }
    return o as EntityTagResponse;
  };
  createExpressEndpoints(entityTagContract, {
    // Get all entitytags
    getAll: async ({ query }) => {
      try {
        const { page = 1, limit = 20, sortBy, sortOrder, search } = query as any;
        const result = await service.getAll({ page, limit, sortBy, sortOrder, search } as any);

        return {
          status: 200,
          body: {
            success: true,
            data: ((result as any).items || []).map(normalize),
            pagination: {
              total: (result as any).total,
              page,
              limit,
              totalPages: Math.ceil((result as any).total / limit),
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
    getById: async ({ params }) => {
      try {
        const result = await service.getById(params.id);

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
            data: normalize(result),
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
        const result = await service.create(body as any);

        return {
          status: 201,
          body: {
            success: true,
            data: normalize(result),
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
        const result = await service.update(params.id, body as any);

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
            data: normalize(result),
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
        await service.delete(params.id);

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

    // Bulk operations not implemented
    bulkCreate: async () => ({ status: 501, body: { success: false, error: 'Not implemented' } } as any),
    bulkUpdate: async () => ({ status: 501, body: { success: false, error: 'Not implemented' } } as any),
    bulkDelete: async () => ({ status: 501, body: { success: false, error: 'Not implemented' } } as any),
  }, app);

  logger.info('EntityTag routes initialized with ts-rest');
}