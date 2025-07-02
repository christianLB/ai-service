// AI-Powered Transaction Categorization Service
// Intelligent financial categorization using pattern matching and machine learning

import { Pool } from 'pg';
import { AITag, TransactionCategorization, Category, Subcategory } from './types';

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

export class AICategorization {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ============================================================================
  // AI CATEGORIZATION ENGINE
  // ============================================================================

  /**
   * Analyze a transaction and suggest categorization
   */
  async categorizeTransaction(transaction: {
    id: string;
    description?: string;
    counterpartyName?: string;
    amount: string;
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
      console.error('AI categorization failed:', error);
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

    // Get transaction details
    const query = `
      SELECT id, description, counterparty_name, amount, date, account_id
      FROM financial.transactions 
      WHERE id = ANY($1) AND status = 'confirmed'
    `;
    
    const transactionsResult = await this.pool.query(query, [transactionIds]);
    
    // Process each transaction
    for (const transaction of transactionsResult.rows) {
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
          console.warn(`Invalid regex pattern: ${pattern}`);
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
    const amount = parseFloat(transaction.amount);
    
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
    // Look for similar transactions from the same counterparty
    const similarQuery = `
      SELECT COUNT(*) as count, 
             array_agg(date ORDER BY date) as dates,
             AVG(ABS(amount)) as avg_amount
      FROM financial.transactions 
      WHERE counterparty_name ILIKE $1 
        AND account_id = $2 
        AND status = 'confirmed'
        AND id != $3
        AND date >= $4
    `;

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await this.pool.query(similarQuery, [
      transaction.counterpartyName || '',
      transaction.accountId,
      transaction.id,
      threeMonthsAgo
    ]);

    const similarTx = result.rows[0];
    if (parseInt(similarTx.count) >= 2) {
      // Analyze frequency pattern
      const dates = similarTx.dates;
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
            reasoning: `Recurring transaction pattern detected (${similarTx.count} similar transactions)`
          };
        }
      }
    }

    return null;
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
      console.error('Failed to process learning feedback:', error);
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
    topPerformingTags: AITag[];
    improvementSuggestions: string[];
  }> {
    // Get prediction accuracy
    const accuracyQuery = `
      SELECT 
        COUNT(*) as total_predictions,
        SUM(CASE WHEN user_confirmed = true THEN 1 ELSE 0 END) as correct_predictions
      FROM financial.transaction_categorizations 
      WHERE method IN ('ai_auto', 'ai_suggested') 
        AND user_confirmed IS NOT NULL
    `;

    const accuracyResult = await this.pool.query(accuracyQuery);
    const stats = accuracyResult.rows[0];
    
    const totalPredictions = parseInt(stats.total_predictions);
    const correctPredictions = parseInt(stats.correct_predictions);
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

    // Get top performing tags
    const topTagsQuery = `
      SELECT at.*, 
             COUNT(tc.id) as usage_count,
             AVG(CASE WHEN tc.user_confirmed = true THEN 1.0 ELSE 0.0 END) as success_rate
      FROM financial.ai_tags at
      LEFT JOIN financial.transaction_categorizations tc ON at.id = tc.ai_tag_id
      WHERE at.is_active = true
      GROUP BY at.id
      HAVING COUNT(tc.id) > 5
      ORDER BY success_rate DESC, usage_count DESC
      LIMIT 5
    `;

    const topTagsResult = await this.pool.query(topTagsQuery);
    const topPerformingTags = topTagsResult.rows;

    // Generate improvement suggestions
    const suggestions = await this.generateImprovementSuggestions(accuracy, topPerformingTags);

    return {
      totalPredictions,
      correctPredictions,
      accuracy,
      topPerformingTags,
      improvementSuggestions: suggestions
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getActiveAITags(): Promise<AITag[]> {
    const query = `
      SELECT id, name, description, keywords, merchant_patterns, amount_patterns,
             category_id, subcategory_id, confidence_score, match_count, success_rate, last_used
      FROM financial.ai_tags 
      WHERE is_active = true 
      ORDER BY confidence_score DESC, success_rate DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(this.mapAITagRow);
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
    // This would update success rates of AI tags based on user feedback
    // Implementation would depend on how we track which tag made the prediction
  }

  private async createLearningTag(feedback: LearningFeedback): Promise<void> {
    // Get transaction details to create a new learning tag
    const txQuery = `
      SELECT description, counterparty_name, amount 
      FROM financial.transactions 
      WHERE id = $1
    `;
    
    const txResult = await this.pool.query(txQuery, [feedback.transactionId]);
    if (txResult.rows.length === 0) return;

    const tx = txResult.rows[0];
    
    // Create a new AI tag based on this transaction pattern
    const newTagQuery = `
      INSERT INTO financial.ai_tags (name, description, keywords, category_id, subcategory_id, confidence_score)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const keywords = this.extractKeywords(tx.description, tx.counterparty_name);
    const tagName = `Learned: ${tx.counterparty_name || 'Unknown'}`;
    const description = `Auto-generated tag from user feedback`;

    await this.pool.query(newTagQuery, [
      tagName,
      description,
      keywords,
      feedback.actualCategoryId,
      feedback.actualSubcategoryId,
      0.6 // Start with moderate confidence
    ]);
  }

  private async refineTags(feedback: LearningFeedback): Promise<void> {
    // Refine existing tags based on feedback patterns
    // This could adjust confidence scores, add keywords, etc.
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

    return suggestions;
  }

  private extractKeywords(description: string, counterparty: string): string[] {
    const text = `${description || ''} ${counterparty || ''}`.toLowerCase();
    const words = text.split(/\W+/).filter(word => word.length > 2);
    
    // Remove common stop words
    const stopWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was'];
    return words.filter(word => !stopWords.includes(word)).slice(0, 5);
  }

  private mapAITagRow(row: any): AITag {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      keywords: row.keywords || [],
      merchantPatterns: row.merchant_patterns || [],
      amountPatterns: row.amount_patterns,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      confidenceScore: parseFloat(row.confidence_score),
      matchCount: parseInt(row.match_count),
      successRate: parseFloat(row.success_rate),
      lastUsed: row.last_used,
      isActive: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}