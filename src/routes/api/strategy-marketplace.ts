import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { strategyMarketplaceService } from '../../services/trading/marketplace/strategy-marketplace.service';
import { AppError } from '../../utils/errors';
import { Logger } from '../../utils/logger';

// Extend Request to include user
interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

const router = Router();
const logger = new Logger('StrategyMarketplaceRoutes');

// Custom validation middleware for Zod schemas
const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.errors
        });
        return;
      }
      next(error);
    }
  };
};

// Schemas
const createListingSchema = z.object({
  body: z.object({
    strategyId: z.string().uuid(),
    name: z.string().min(3).max(255),
    description: z.string().optional(),
    price: z.number().positive(),
    subscriptionType: z.enum(['one-time', 'monthly', 'yearly']),
    tags: z.array(z.string()).optional(),
  }),
});

const searchListingsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    tags: z.string().optional(), // Comma-separated
    minPrice: z.string().transform(Number).optional(),
    maxPrice: z.string().transform(Number).optional(),
    minRating: z.string().transform(Number).optional(),
    sortBy: z.enum(['rating', 'subscribers', 'price', 'created']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

const subscribeSchema = z.object({
  body: z.object({
    marketplaceId: z.string().uuid(),
    tier: z.enum(['basic', 'pro', 'institutional']),
    paymentMethod: z.string().optional(),
  }),
});

const addReviewSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    rating: z.number().min(1).max(5),
    title: z.string().max(255).optional(),
    comment: z.string().optional(),
  }),
});

// Routes

/**
 * Search marketplace listings
 */
router.get('/', validateSchema(searchListingsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = {
      ...req.query,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const result = await strategyMarketplaceService.searchListings(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Get listing details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await strategyMarketplaceService.getListing(req.params.id);
    
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    res.json(listing);
  } catch (error) {
    next(error);
  }
});

/**
 * Create marketplace listing (authenticated)
 */
router.post('/', authenticate, validateSchema(createListingSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listing = await strategyMarketplaceService.createListing({
      ...req.body,
      userId: req.user!.id,
    });

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
});

/**
 * Subscribe to a strategy (authenticated)
 */
router.post('/subscribe', authenticate, validateSchema(subscribeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subscription = await strategyMarketplaceService.subscribe({
      ...req.body,
      userId: req.user!.id,
    });

    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel subscription (authenticated)
 */
router.delete('/subscriptions/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await strategyMarketplaceService.cancelSubscription(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Get user's subscriptions (authenticated)
 */
router.get('/subscriptions/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subscriptions = await strategyMarketplaceService.getUserSubscriptions(req.user!.id);
    res.json(subscriptions);
  } catch (error) {
    next(error);
  }
});

/**
 * Get seller's listings (authenticated)
 */
router.get('/listings/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listings = await strategyMarketplaceService.getSellerListings(req.user!.id);
    res.json(listings);
  } catch (error) {
    next(error);
  }
});

/**
 * Add/update review (authenticated)
 */
router.post('/:id/reviews', authenticate, validateSchema(addReviewSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await strategyMarketplaceService.addReview(
      req.params.id,
      req.user!.id,
      req.body.rating,
      req.body.title,
      req.body.comment
    );

    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify strategy performance (admin only)
 */
router.post('/:id/verify', authenticate, async (req, res, next) => {
  try {
    // TODO: Add admin role check
    await strategyMarketplaceService.verifyPerformance(req.params.id);
    res.json({ message: 'Performance verification completed' });
  } catch (error) {
    next(error);
  }
});

export default router;