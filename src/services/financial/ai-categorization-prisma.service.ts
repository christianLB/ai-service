// AI-Powered Transaction Categorization Service with Prisma
// Intelligent financial categorization using pattern matching and machine learning

import { prisma } from '../../lib/prisma';
import type { Prisma } from '../../lib/prisma';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

export interface CategorizationResult {
  categoryId?: string;
  subcategoryId?: string;
  confidence: number;
  method: 'ai_pattern' | 'ai_keyword' | 'ai_amount' | 'ai_frequency';
  aiTagId?: string;
  reasoning: string;
}

export interface LearningFeedback {
  transactionId: string;
  actualCategoryId: string;
  actualSubcategoryId?: string;
  predictedCategoryId?: string;
  predictedSubcategoryId?: string;
  wasCorrect: boolean;
}

export interface AITag {
  id: string;
  name: string;
  description?: string;
  keywords: string[];
  merchantPatterns: string[];
  amountPatterns?: any;
  categoryId: string;
  subcategoryId?: string;
  confidenceScore: number;
  matchCount: number;
  successRate: number;
  lastUsed?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AICategorizationPrismaService {
  // ============================================================================
  // AI CATEGORIZATION ENGINE
  // ============================================================================

  /**
   * Analyze a transaction and suggest categorization
   */
  async categorizeTransaction(transaction: {
    id: string;
    description?: string | null;
    counterpartyName?: string | null;
    amount: number | Prisma.Decimal;
    date: Date;
    accountId: string;
  }): Promise<CategorizationResult | null> {
    try {
      // Get all active AI tags for matching
      const aiTags = await this.getActiveAITags();
      
      // Try different categorization methods in order of confidence
      const results = await Promise.all([
        this.matchByMerchantPattern(transaction, aiTags),
        this.matchByKeywords(transaction, aiTags),
        this.matchByAmountPattern(transaction, aiTags),
        this.matchByFrequencyPattern(transaction, aiTags)
      ]);

      // Find the best match
      const bestMatch = results
        .filter(result => result !== null)
        .sort((a, b) => b!.confidence - a!.confidence)[0];

      return bestMatch || null;
    } catch (error) {
      logger.error('AI categorization failed:', error);
      return null;
    }
  }

  /**
   * Batch categorize multiple transactions
   */
  async batchCategorizeTransactions(
    transactionIds: string[]
  ): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();

    try {
      // Get transaction details
      const transactions = await prisma.transactions.findMany({
        where: {
          id: { in: transactionIds },
          status: 'confirmed'
        }
      });
      
      // Process each transaction
      for (const transaction of transactions) {
        const result = await this.categorizeTransaction({
          id: transaction.id,
          description: transaction.description,
          counterpartyName: transaction.counterparty_name,
          amount: transaction.amount,
          date: transaction.date,
          accountId: transaction.account_id
        });

        if (result) {
          results.set(transaction.id, result);
        }
      }

      return results;
    } catch (error) {
      logger.error('Batch categorization failed:', error);
      throw new AppError('Failed to batch categorize transactions', 500);
    }
  }

  // ============================================================================
  // PATTERN MATCHING METHODS
  // ============================================================================

  /**
   * Match by merchant/counterparty patterns (highest confidence)
   */
  private async matchByMerchantPattern(
    transaction: any,
    aiTags: AITag[]
  ): Promise<CategorizationResult | null> {
    const counterparty = (transaction.counterpartyName || '').toLowerCase();
    const description = (transaction.description || '').toLowerCase();
    
    for (const tag of aiTags) {
      if (!tag.merchantPatterns || tag.merchantPatterns.length === 0) continue;

      for (const pattern of tag.merchantPatterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(counterparty) || regex.test(description)) {
            return {
              categoryId: tag.categoryId,
              subcategoryId: tag.subcategoryId,
              confidence: Math.min(tag.confidenceScore * 1.1, 0.98), // Boost merchant matches
              method: 'ai_pattern',
              aiTagId: tag.id,
              reasoning: `Matched merchant pattern: ${pattern}`
            };
          }
        } catch (error) {
          logger.warn(`Invalid regex pattern: ${pattern}`);
        }
      }
    }

    return null;
  }

  /**
   * Match by keywords in description/counterparty
   */
  private async matchByKeywords(
    transaction: any,
    aiTags: AITag[]
  ): Promise<CategorizationResult | null> {
    const searchText = `${transaction.description || ''} ${transaction.counterpartyName || ''}`.toLowerCase();
    
    let bestMatch: { tag: AITag; matchedKeywords: string[] } | null = null;
    let maxMatches = 0;

    for (const tag of aiTags) {
      if (!tag.keywords || tag.keywords.length === 0) continue;

      const matchedKeywords = tag.keywords.filter(keyword =>
        searchText.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > maxMatches) {
        maxMatches = matchedKeywords.length;
        bestMatch = { tag, matchedKeywords };
      }
    }

    if (bestMatch && maxMatches > 0) {
      // Calculate confidence based on keyword match ratio
      const keywordRatio = maxMatches / bestMatch.tag.keywords.length;
      const confidence = Math.min(bestMatch.tag.confidenceScore * keywordRatio, 0.9);

      if (confidence > 0.5) { // Only return if confidence is reasonable
        return {
          categoryId: bestMatch.tag.categoryId,
          subcategoryId: bestMatch.tag.subcategoryId,
          confidence,
          method: 'ai_keyword',
          aiTagId: bestMatch.tag.id,
          reasoning: `Matched keywords: ${bestMatch.matchedKeywords.join(', ')}`
        };
      }
    }

    return null;
  }

  /**
   * Match by amount patterns (recurring payments, typical amounts)
   */
  private async matchByAmountPattern(
    transaction: any,
    aiTags: AITag[]
  ): Promise<CategorizationResult | null> {
    const amount = typeof transaction.amount === 'object' 
      ? parseFloat(transaction.amount.toString()) 
      : parseFloat(transaction.amount);
    
    for (const tag of aiTags) {
      if (!tag.amountPatterns) continue;

      const patterns = tag.amountPatterns;
      
      // Check exact amount match
      if (patterns.exactAmounts && patterns.exactAmounts.includes(amount)) {
        return {
          categoryId: tag.categoryId,
          subcategoryId: tag.subcategoryId,
          confidence: tag.confidenceScore * 0.85,
          method: 'ai_amount',
          aiTagId: tag.id,
          reasoning: `Matched exact amount: €${amount}`
        };
      }

      // Check amount range
      if (patterns.minAmount && patterns.maxAmount) {
        if (amount >= patterns.minAmount && amount <= patterns.maxAmount) {
          return {
            categoryId: tag.categoryId,
            subcategoryId: tag.subcategoryId,
            confidence: tag.confidenceScore * 0.7,
            method: 'ai_amount',
            aiTagId: tag.id,
            reasoning: `Amount in range: €${patterns.minAmount} - €${patterns.maxAmount}`
          };
        }
      }
    }

    return null;
  }

  /**
   * Match by frequency patterns (monthly, weekly recurring transactions)
   */
  private async matchByFrequencyPattern(
    transaction: any,
    aiTags: AITag[]
  ): Promise<CategorizationResult | null> {
    try {
      if (!transaction.counterpartyName) return null;

      // Look for similar transactions from the same counterparty
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const similarTransactions = await prisma.transactions.findMany({
        where: {
          counterparty_name: {
            equals: transaction.counterpartyName,
            mode: 'insensitive'
          },
          account_id: transaction.accountId,
          status: 'confirmed',
          id: { not: transaction.id },
          date: { gte: threeMonthsAgo }
        },
        orderBy: {
          date: 'asc'
        }
      });

      if (similarTransactions.length >= 2) {
        // Analyze frequency pattern
        const dates = [transaction.date, ...similarTransactions.map(tx => tx.date)];
        const isRecurring = this.analyzeRecurringPattern(dates);
        
        if (isRecurring) {
          // Find best matching tag for recurring transactions
          const recurringTags = aiTags.filter(tag => 
            tag.keywords.some(keyword => 
              ['subscription', 'recurring', 'monthly', 'weekly'].includes(keyword.toLowerCase())
            )
          );

          if (recurringTags.length > 0) {
            const bestTag = recurringTags[0];
            return {
              categoryId: bestTag.categoryId,
              subcategoryId: bestTag.subcategoryId,
              confidence: 0.75,
              method: 'ai_frequency',
              aiTagId: bestTag.id,
              reasoning: `Recurring transaction pattern detected (${similarTransactions.length + 1} similar transactions)`
            };
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Frequency pattern matching failed:', error);
      return null;
    }
  }

  // ============================================================================
  // LEARNING & FEEDBACK
  // ============================================================================

  /**
   * Learn from user feedback to improve AI accuracy
   */
  async processFeedback(feedback: LearningFeedback): Promise<void> {
    try {
      // Update AI tag success rates
      await this.updateAITagStats(feedback);
      
      // Create new AI tags based on patterns
      if (!feedback.wasCorrect && feedback.predictedCategoryId) {
        await this.createLearningTag(feedback);
      }
      
      // Update existing tags based on feedback
      await this.refineTags(feedback);
    } catch (error) {
      logger.error('Failed to process learning feedback:', error);
      throw new AppError('Failed to process learning feedback', 500);
    }
  }

  /**
   * Batch process learning feedback
   */
  async batchProcessFeedback(feedbacks: LearningFeedback[]): Promise<void> {
    for (const feedback of feedbacks) {
      await this.processFeedback(feedback);
    }
  }

  /**
   * Get AI categorization performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    topPerformingTags: any[];
    improvementSuggestions: string[];
  }> {
    try {
      // Get prediction accuracy
      const predictions = await prisma.transaction_categorizations.findMany({
        where: {
          method: { in: ['ai_auto', 'ai_suggested'] },
          user_confirmed: { not: null }
        }
      });
      
      const totalPredictions = predictions.length;
      const correctPredictions = predictions.filter(p => p.user_confirmed === true).length;
      const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

      // Get top performing tags with usage statistics
      const tagStats = await prisma.ai_tags.findMany({
        where: { is_active: true },
        include: {
          _count: {
            select: { transaction_categorizations: true }
          }
        },
        orderBy: [
          { success_rate: 'desc' },
          { match_count: 'desc' }
        ],
        take: 5
      });

      const topPerformingTags = tagStats.filter(tag => tag._count.transaction_categorizations > 5);

      // Generate improvement suggestions
      const suggestions = await this.generateImprovementSuggestions(accuracy, topPerformingTags);

      return {
        totalPredictions,
        correctPredictions,
        accuracy,
        topPerformingTags,
        improvementSuggestions: suggestions
      };
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      throw new AppError('Failed to get performance metrics', 500);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getActiveAITags(): Promise<AITag[]> {
    try {
      const tags = await prisma.ai_tags.findMany({
        where: { is_active: true },
        orderBy: [
          { confidence_score: 'desc' },
          { success_rate: 'desc' }
        ]
      });

      return tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        description: tag.description,
        keywords: tag.keywords || [],
        merchantPatterns: tag.merchant_patterns || [],
        amountPatterns: tag.amount_patterns as any,
        categoryId: tag.category_id,
        subcategoryId: tag.subcategory_id || undefined,
        confidenceScore: tag.confidence_score.toNumber(),
        matchCount: tag.match_count,
        successRate: tag.success_rate.toNumber(),
        lastUsed: tag.last_used || undefined,
        isActive: tag.is_active,
        createdAt: tag.created_at,
        updatedAt: tag.updated_at
      }));
    } catch (error) {
      logger.error('Failed to get active AI tags:', error);
      return [];
    }
  }

  private analyzeRecurringPattern(dates: Date[]): boolean {
    if (dates.length < 2) return false;

    // Sort dates and calculate intervals
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    const intervals: number[] = [];

    for (let i = 1; i < sortedDates.length; i++) {
      const interval = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
      intervals.push(Math.round(interval / (1000 * 60 * 60 * 24))); // Days
    }

    // Check for monthly pattern (28-32 days)
    const monthlyPattern = intervals.every(interval => interval >= 28 && interval <= 32);
    
    // Check for weekly pattern (6-8 days)
    const weeklyPattern = intervals.every(interval => interval >= 6 && interval <= 8);
    
    // Check for bi-weekly pattern (13-15 days)
    const biWeeklyPattern = intervals.every(interval => interval >= 13 && interval <= 15);

    return monthlyPattern || weeklyPattern || biWeeklyPattern;
  }

  private async updateAITagStats(feedback: LearningFeedback): Promise<void> {
    // Update success rates of AI tags based on user feedback
    if (feedback.predictedCategoryId) {
      const categorization = await prisma.transaction_categorizations.findFirst({
        where: {
          transaction_id: feedback.transactionId,
          category_id: feedback.predictedCategoryId
        }
      });

      if (categorization && categorization.ai_tag_id) {
        await prisma.ai_tags.update({
          where: { id: categorization.ai_tag_id },
          data: {
            match_count: { increment: 1 },
            success_rate: feedback.wasCorrect ? { increment: 0.01 } : { decrement: 0.01 },
            last_used: new Date()
          }
        });
      }
    }
  }

  private async createLearningTag(feedback: LearningFeedback): Promise<void> {
    try {
      // Get transaction details to create a new learning tag
      const transaction = await prisma.transactions.findUnique({
        where: { id: feedback.transactionId }
      });
      
      if (!transaction) return;
      
      // Create a new AI tag based on this transaction pattern
      const keywords = this.extractKeywords(
        transaction.description || '', 
        transaction.counterparty_name || ''
      );
      
      await prisma.ai_tags.create({
        data: {
          name: `Learned: ${transaction.counterparty_name || 'Unknown'}`,
          description: 'Auto-generated tag from user feedback',
          keywords,
          category_id: feedback.actualCategoryId,
          subcategory_id: feedback.actualSubcategoryId,
          confidence_score: 0.6, // Start with moderate confidence
          is_active: true
        }
      });
    } catch (error) {
      logger.error('Failed to create learning tag:', error);
    }
  }

  private async refineTags(feedback: LearningFeedback): Promise<void> {
    // Refine existing tags based on feedback patterns
    // This could adjust confidence scores, add keywords, etc.
    // For now, this is a placeholder for future enhancement
  }

  private async generateImprovementSuggestions(
    accuracy: number, 
    topTags: any[]
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (accuracy < 70) {
      suggestions.push('Consider adding more specific AI tags for common merchants');
      suggestions.push('Review and update keyword patterns for better matching');
    }

    if (topTags.length < 5) {
      suggestions.push('Create more AI tags to cover common transaction patterns');
    }

    if (accuracy > 90) {
      suggestions.push('Excellent performance! Consider expanding to more nuanced categorization');
    }

    // Check for underperforming tags
    const underperformingTags = topTags.filter(tag => tag.success_rate < 0.5);
    if (underperformingTags.length > 0) {
      suggestions.push(`Review and improve ${underperformingTags.length} underperforming tags`);
    }

    return suggestions;
  }

  private extractKeywords(description: string, counterparty: string): string[] {
    const text = `${description || ''} ${counterparty || ''}`.toLowerCase();
    const words = text.split(/\W+/).filter(word => word.length > 2);
    
    // Remove common stop words
    const stopWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was'];
    return words.filter(word => !stopWords.includes(word)).slice(0, 5);
  }

  /**
   * Create AI tag for category
   */
  async createAITag(data: {
    name: string;
    description?: string;
    keywords: string[];
    merchantPatterns?: string[];
    amountPatterns?: any;
    categoryId: string;
    subcategoryId?: string;
    confidenceScore?: number;
  }): Promise<AITag> {
    try {
      const tag = await prisma.ai_tags.create({
        data: {
          name: data.name,
          description: data.description,
          keywords: data.keywords,
          merchant_patterns: data.merchantPatterns || [],
          amount_patterns: data.amountPatterns,
          category_id: data.categoryId,
          subcategory_id: data.subcategoryId,
          confidence_score: data.confidenceScore || 0.8,
          is_active: true
        }
      });

      return this.mapAITagFromPrisma(tag);
    } catch (error) {
      logger.error('Failed to create AI tag:', error);
      throw new AppError('Failed to create AI tag', 500);
    }
  }

  /**
   * Update AI tag
   */
  async updateAITag(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      keywords: string[];
      merchantPatterns: string[];
      amountPatterns: any;
      confidenceScore: number;
      isActive: boolean;
    }>
  ): Promise<AITag> {
    try {
      const tag = await prisma.ai_tags.update({
        where: { id },
        data: {
          name: updates.name,
          description: updates.description,
          keywords: updates.keywords,
          merchant_patterns: updates.merchantPatterns,
          amount_patterns: updates.amountPatterns,
          confidence_score: updates.confidenceScore,
          is_active: updates.isActive,
          updated_at: new Date()
        }
      });

      return this.mapAITagFromPrisma(tag);
    } catch (error) {
      logger.error('Failed to update AI tag:', error);
      throw new AppError('Failed to update AI tag', 500);
    }
  }

  private mapAITagFromPrisma(tag: any): AITag {
    return {
      id: tag.id,
      name: tag.name,
      description: tag.description,
      keywords: tag.keywords || [],
      merchantPatterns: tag.merchant_patterns || [],
      amountPatterns: tag.amount_patterns,
      categoryId: tag.category_id,
      subcategoryId: tag.subcategory_id,
      confidenceScore: tag.confidence_score.toNumber(),
      matchCount: tag.match_count,
      successRate: tag.success_rate.toNumber(),
      lastUsed: tag.last_used,
      isActive: tag.is_active,
      createdAt: tag.created_at,
      updatedAt: tag.updated_at
    };
  }
}

// Export singleton instance
export const aiCategorizationPrismaService = new AICategorizationPrismaService();