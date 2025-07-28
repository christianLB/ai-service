import { Router } from 'express';
import tagRoutes from './tag.routes';
import entityRoutes from './entity.routes';
import operationsRoutes from './operations.routes';

const router = Router();

// Mount tag management routes
router.use('/tags', tagRoutes);

// Mount entity tagging routes
router.use('/entities', entityRoutes);

// Mount batch operations and analytics routes
router.use('/tagging', operationsRoutes);

// Root endpoint for API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Universal AI Tagging System',
      version: '1.0.0',
      endpoints: {
        tags: {
          list: 'GET /api/tags',
          create: 'POST /api/tags',
          search: 'GET /api/tags/search',
          get: 'GET /api/tags/:id',
          update: 'PUT /api/tags/:id',
          delete: 'DELETE /api/tags/:id'
        },
        entities: {
          tag: 'POST /api/entities/:type/:id/tags',
          getTags: 'GET /api/entities/:type/:id/tags',
          removeTag: 'DELETE /api/entities/:type/:id/tags/:tagId',
          updateTag: 'PATCH /api/entities/:type/:id/tags/:tagId',
          findByTag: 'GET /api/entities/by-tag/:tagId'
        },
        operations: {
          batch: 'POST /api/tagging/batch',
          retag: 'POST /api/tagging/retag',
          feedback: 'POST /api/tagging/feedback',
          learn: 'POST /api/tagging/learn',
          accuracy: 'GET /api/tagging/accuracy'
        },
        analytics: {
          tagMetrics: 'GET /api/tags/:id/metrics',
          relationships: 'GET /api/relationships/:type/:id'
        }
      },
      documentation: '/docs/universal-tagging/api-reference.md'
    }
  });
});

export default router;