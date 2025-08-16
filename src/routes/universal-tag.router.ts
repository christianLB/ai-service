import { createExpressEndpoints } from '@ts-rest/express';
import { Express } from 'express';
import { universalTagContract } from '../../packages/contracts/src/contracts/universal-tag';
import { universalTagService } from '../services/tagging/universal-tag.service';
import logger from '../utils/logger';
import type {
  UniversalTagCreate,
  UniversalTagUpdate,
  UniversalTagQuery,
} from '../../packages/contracts/src/schemas/universal-tag';

const service = universalTagService;

export function setupUniversalTagRoutes(app: Express) {
  const sanitize = (r: any) => ({
    ...r,
    description: r?.description ?? undefined,
    color: r?.color ?? undefined,
    icon: r?.icon ?? undefined,
    parentId: r?.parentId ?? undefined,
    metadata: r?.metadata ?? undefined,
    entityTags: r?.entityTags ?? '',
  });
  createExpressEndpoints(
    universalTagContract,
    {
      // Get all universaltags
      getAll: async ({ query }: { query: UniversalTagQuery }) => {
        try {
          const { page = 1, limit = 20, sortBy, sortOrder, search } = query;
          const result = await service.getAll({
            page,
            limit,
            sortBy: sortBy as any,
            sortOrder: (sortOrder as any) || 'desc',
            search,
          } as any);

          return {
            status: 200,
            body: {
              success: true,
              data: result.items.map((item: any) => sanitize(item)),
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
      getById: async ({ params }: { params: { id: string } }) => {
        try {
          const result = await service.getById(params.id);

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
              data: sanitize(result),
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
      create: async ({ body }: { body: UniversalTagCreate }) => {
        try {
          const normalized = {
            ...body,
            entityTypes: Array.isArray(body.entityTypes)
              ? body.entityTypes
              : body.entityTypes
                ? [body.entityTypes]
                : [],
          } as any;
          const result = await service.create(normalized);

          return {
            status: 201,
            body: {
              success: true,
              data: sanitize(result),
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
      update: async ({ params, body }: { params: { id: string }; body: UniversalTagUpdate }) => {
        try {
          const normalized = {
            ...body,
            entityTypes: Array.isArray(body.entityTypes)
              ? body.entityTypes
              : body.entityTypes
                ? [body.entityTypes]
                : [],
          } as any;
          const result = await service.update(params.id, normalized);

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
              data: sanitize(result),
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
      delete: async ({ params }: { params: { id: string } }) => {
        try {
          await service.delete(params.id);

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

      // Bulk create universaltags - not implemented yet
      bulkCreate: async () =>
        ({
          status: 501,
          body: { success: false, error: 'Bulk create not implemented' },
        }) as any,

      // Bulk update universaltags - not implemented yet
      bulkUpdate: async () =>
        ({
          status: 501,
          body: { success: false, error: 'Bulk update not implemented' },
        }) as any,

      // Bulk delete universaltags - not implemented yet
      bulkDelete: async () =>
        ({
          status: 501,
          body: { success: false, error: 'Bulk delete not implemented' },
        }) as any,
    },
    app as any
  );

  logger.info('UniversalTag routes initialized with ts-rest');
}
