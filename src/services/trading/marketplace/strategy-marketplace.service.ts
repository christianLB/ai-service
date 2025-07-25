import { prisma } from '../../../lib/prisma';
import { Logger } from '../../../utils/logger';
import { Prisma } from '@prisma/client';
import { claudeAIService } from '../../ai/claude.service';

const logger = new Logger('StrategyMarketplaceService');

export interface MarketplaceListingInput {
  strategyId: string;
  userId: string;
  name: string;
  description?: string;
  price: number;
  subscriptionType: 'one-time' | 'monthly' | 'yearly';
  tags?: string[];
}

export interface MarketplaceSearchParams {
  search?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'rating' | 'subscribers' | 'price' | 'created';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SubscriptionInput {
  userId: string;
  marketplaceId: string;
  tier: 'basic' | 'pro' | 'institutional';
  paymentMethod?: string;
}

export class StrategyMarketplaceService {
  private static instance: StrategyMarketplaceService;

  private constructor() {}

  static getInstance(): StrategyMarketplaceService {
    if (!StrategyMarketplaceService.instance) {
      StrategyMarketplaceService.instance = new StrategyMarketplaceService();
    }
    return StrategyMarketplaceService.instance;
  }

  /**
   * List a strategy on the marketplace
   */
  async createListing(input: MarketplaceListingInput): Promise<any> {
    try {
      // Verify strategy exists and belongs to user
      const strategy = await prisma.strategy.findFirst({
        where: {
          id: input.strategyId,
          userId: input.userId,
        },
      });

      if (!strategy) {
        throw new Error('Strategy not found or does not belong to user');
      }

      // Calculate initial performance data
      const performanceData = await this.calculateStrategyPerformance(input.strategyId);

      // Create marketplace listing
      const listing = await prisma.strategyMarketplace.create({
        data: {
          strategyId: input.strategyId,
          userId: input.userId,
          name: input.name,
          description: input.description,
          price: input.price,
          subscriptionType: input.subscriptionType,
          tags: input.tags || [],
          performanceData: performanceData as any,
          status: 'active',
        },
        include: {
          strategy: true,
          user: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
        },
      });

      logger.info(`Strategy listed on marketplace: ${listing.id}`);
      return listing;
    } catch (error) {
      logger.error('Failed to create marketplace listing', error);
      throw error;
    }
  }

  /**
   * Search marketplace listings
   */
  async searchListings(params: MarketplaceSearchParams): Promise<{
    listings: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        status: 'active',
      };

      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      if (params.tags && params.tags.length > 0) {
        where.tags = { hasEvery: params.tags };
      }

      if (params.minPrice !== undefined) {
        where.price = { ...where.price, gte: params.minPrice };
      }

      if (params.maxPrice !== undefined) {
        where.price = { ...where.price, lte: params.maxPrice };
      }

      if (params.minRating !== undefined) {
        where.rating = { gte: params.minRating };
      }

      // Build orderBy
      const orderBy: any = {};
      if (params.sortBy) {
        switch (params.sortBy) {
          case 'rating':
            orderBy.rating = params.sortOrder || 'desc';
            break;
          case 'subscribers':
            orderBy.totalSubscribers = params.sortOrder || 'desc';
            break;
          case 'price':
            orderBy.price = params.sortOrder || 'asc';
            break;
          case 'created':
            orderBy.createdAt = params.sortOrder || 'desc';
            break;
        }
      } else {
        orderBy.rating = 'desc'; // Default sort by rating
      }

      // Execute query
      const [listings, total] = await Promise.all([
        prisma.strategyMarketplace.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            strategy: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            user: {
              select: {
                id: true,
                full_name: true,
              },
            },
            _count: {
              select: {
                subscriptions: true,
                reviews: true,
              },
            },
          },
        }),
        prisma.strategyMarketplace.count({ where }),
      ]);

      return {
        listings,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to search marketplace listings', error);
      throw error;
    }
  }

  /**
   * Get listing details
   */
  async getListing(listingId: string): Promise<any | null> {
    try {
      const listing = await prisma.strategyMarketplace.findUnique({
        where: { id: listingId },
        include: {
          strategy: true,
          user: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              user: {
                select: {
                  id: true,
                  full_name: true,
                },
              },
            },
          },
          performance: {
            where: {
              period: 'monthly',
            },
            orderBy: { startDate: 'desc' },
            take: 6,
          },
          _count: {
            select: {
              subscriptions: true,
              reviews: true,
            },
          },
        },
      });

      return listing;
    } catch (error) {
      logger.error('Failed to get marketplace listing', error);
      throw error;
    }
  }

  /**
   * Subscribe to a strategy
   */
  async subscribe(input: SubscriptionInput): Promise<any> {
    try {
      // Get listing details
      const listing = await prisma.strategyMarketplace.findUnique({
        where: { id: input.marketplaceId },
      });

      if (!listing) {
        throw new Error('Listing not found');
      }

      // Check if already subscribed
      const existingSubscription = await prisma.strategySubscription.findFirst({
        where: {
          userId: input.userId,
          marketplaceId: input.marketplaceId,
          status: 'active',
        },
      });

      if (existingSubscription) {
        throw new Error('Already subscribed to this strategy');
      }

      // Calculate subscription details
      const now = new Date();
      let expiresAt: Date;
      let amount: number;

      switch (listing.subscriptionType) {
        case 'monthly':
          expiresAt = new Date(now.setMonth(now.getMonth() + 1));
          amount = listing.price.toNumber();
          break;
        case 'yearly':
          expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
          amount = listing.price.toNumber() * 10; // 2 months free on yearly
          break;
        case 'one-time':
          expiresAt = new Date('2099-12-31'); // Effectively lifetime
          amount = listing.price.toNumber();
          break;
        default:
          throw new Error('Invalid subscription type');
      }

      // Create subscription
      const subscription = await prisma.strategySubscription.create({
        data: {
          userId: input.userId,
          marketplaceId: input.marketplaceId,
          tier: input.tier,
          status: 'active',
          expiresAt,
          amount,
          paymentMethod: input.paymentMethod,
          autoRenew: listing.subscriptionType !== 'one-time',
        },
      });

      // Update subscriber count
      await prisma.strategyMarketplace.update({
        where: { id: input.marketplaceId },
        data: {
          totalSubscribers: { increment: 1 },
          totalRevenue: { increment: amount },
        },
      });

      logger.info(`User ${input.userId} subscribed to strategy ${input.marketplaceId}`);
      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to strategy', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, userId: string): Promise<void> {
    try {
      const subscription = await prisma.strategySubscription.findFirst({
        where: {
          id: subscriptionId,
          userId,
          status: 'active',
        },
      });

      if (!subscription) {
        throw new Error('Active subscription not found');
      }

      // Update subscription status
      await prisma.strategySubscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'cancelled',
          autoRenew: false,
        },
      });

      // Update subscriber count
      await prisma.strategyMarketplace.update({
        where: { id: subscription.marketplaceId },
        data: {
          totalSubscribers: { decrement: 1 },
        },
      });

      logger.info(`Subscription ${subscriptionId} cancelled`);
    } catch (error) {
      logger.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  /**
   * Add review
   */
  async addReview(
    marketplaceId: string,
    userId: string,
    rating: number,
    title?: string,
    comment?: string
  ): Promise<void> {
    try {
      // Verify user has an active subscription
      const subscription = await prisma.strategySubscription.findFirst({
        where: {
          userId,
          marketplaceId,
          status: 'active',
        },
      });

      if (!subscription) {
        throw new Error('Must be subscribed to leave a review');
      }

      // Create or update review
      await prisma.strategyReview.upsert({
        where: {
          marketplaceId_userId: {
            marketplaceId,
            userId,
          },
        },
        create: {
          marketplaceId,
          userId,
          rating,
          title,
          comment,
          isVerified: true,
        },
        update: {
          rating,
          title,
          comment,
          updatedAt: new Date(),
        },
      });

      // Update average rating
      await this.updateAverageRating(marketplaceId);

      logger.info(`Review added for marketplace listing ${marketplaceId}`);
    } catch (error) {
      logger.error('Failed to add review', error);
      throw error;
    }
  }

  /**
   * Verify strategy performance
   */
  async verifyPerformance(marketplaceId: string): Promise<void> {
    try {
      const listing = await prisma.strategyMarketplace.findUnique({
        where: { id: marketplaceId },
        include: { strategy: true },
      });

      if (!listing) {
        throw new Error('Listing not found');
      }

      // Get actual trading performance
      const trades = await prisma.trade.findMany({
        where: {
          strategyId: listing.strategyId,
          executedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      // Calculate metrics
      const totalTrades = trades.length;
      const winningTrades = trades.filter((t: any) => t.pnl && Number(t.pnl) > 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const totalPnl = trades.reduce((sum: number, t: any) => sum + Number(t.pnl || 0), 0);

      // Store performance record
      await prisma.strategyPerformance.create({
        data: {
          marketplaceId,
          period: 'monthly',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          totalTrades,
          winRate,
          totalPnl,
        },
      });

      // Update listing with verified status
      await prisma.strategyMarketplace.update({
        where: { id: marketplaceId },
        data: {
          isVerified: true,
          performanceData: {
            lastVerified: new Date(),
            monthlyReturn: totalPnl,
            winRate,
            totalTrades,
          },
        },
      });

      logger.info(`Performance verified for marketplace listing ${marketplaceId}`);
    } catch (error) {
      logger.error('Failed to verify performance', error);
      throw error;
    }
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<any[]> {
    try {
      const subscriptions = await prisma.strategySubscription.findMany({
        where: {
          userId,
          status: 'active',
        },
        include: {
          marketplace: {
            include: {
              strategy: true,
              user: {
                select: {
                  id: true,
                  full_name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscriptions;
    } catch (error) {
      logger.error('Failed to get user subscriptions', error);
      throw error;
    }
  }

  /**
   * Get seller's listings
   */
  async getSellerListings(userId: string): Promise<any[]> {
    try {
      const listings = await prisma.strategyMarketplace.findMany({
        where: { userId },
        include: {
          strategy: true,
          _count: {
            select: {
              subscriptions: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return listings;
    } catch (error) {
      logger.error('Failed to get seller listings', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async calculateStrategyPerformance(strategyId: string): Promise<object> {
    try {
      const trades = await prisma.trade.findMany({
        where: {
          strategyId,
          executedAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
        },
      });

      const totalTrades = trades.length;
      const winningTrades = trades.filter((t: any) => t.pnl && Number(t.pnl) > 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const totalPnl = trades.reduce((sum: number, t: any) => sum + Number(t.pnl || 0), 0);
      const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

      // Calculate max drawdown
      let peak = 0;
      let maxDrawdown = 0;
      let runningPnl = 0;

      for (const trade of trades.sort((a: any, b: any) => (a.executedAt?.getTime() || 0) - (b.executedAt?.getTime() || 0))) {
        runningPnl += Number(trade.pnl || 0);
        if (runningPnl > peak) {
          peak = runningPnl;
        }
        const drawdown = (peak - runningPnl) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      return {
        totalTrades,
        winRate,
        totalPnl,
        avgPnl,
        maxDrawdown: maxDrawdown * 100,
        last90Days: true,
      };
    } catch (error) {
      logger.error('Failed to calculate strategy performance', error);
      return {};
    }
  }

  private async updateAverageRating(marketplaceId: string): Promise<void> {
    try {
      const reviews = await prisma.strategyReview.findMany({
        where: { marketplaceId },
        select: { rating: true },
      });

      if (reviews.length === 0) return;

      const avgRating = reviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / reviews.length;

      await prisma.strategyMarketplace.update({
        where: { id: marketplaceId },
        data: { rating: avgRating },
      });
    } catch (error) {
      logger.error('Failed to update average rating', error);
    }
  }
}

export const strategyMarketplaceService = StrategyMarketplaceService.getInstance();