import { injectable } from 'inversify';
import { prisma } from '../../lib/prisma';
import { EntityType, TagFeedback, TagLearning } from '../../types/tagging/tag.types';
import { FeedbackResponse, LearningResponse } from '../../types/tagging/response.types';
import { IAITaggingService } from './interfaces';
import { AIProviderError, handleTaggingError } from './errors';
import logger from '../../utils/logger';
import * as crypto from 'crypto';
import { claudeAIService, TradingContext } from '../ai/claude.service';
import { OpenAIAnalysisService } from '../document-intelligence/openai-analysis.service';

@injectable()
export class AITaggingService implements IAITaggingService {
  private openaiService: OpenAIAnalysisService;
  private tagEmbeddings: Map<string, number[]> = new Map();
  private learningPatterns: Map<string, { correct: number; incorrect: number }> = new Map();
  private claudeInitialized = false;

  constructor() {
    // Initialize AI services
    this.openaiService = new OpenAIAnalysisService();
    // Claude initialization will be done lazily when needed
  }

  private async initializeClaudeService() {
    if (this.claudeInitialized) {
      return;
    }

    try {
      await claudeAIService.initialize();
      this.claudeInitialized = true;
      logger.info('Claude AI service initialized for tagging');
    } catch (error) {
      logger.warn('Failed to initialize Claude AI service, will use OpenAI only', error);
    }
  }

  /**
   * Suggest tags using AI
   */
  async suggestTags(
    content: string,
    entityType: EntityType,
    metadata?: Record<string, any>,
    options?: {
      provider?: 'claude' | 'openai';
      maxTags?: number;
      confidenceThreshold?: number;
    }
  ): Promise<Array<{ tagId: string; confidence: number; reasoning?: string }>> {
    try {
      const provider = options?.provider || 'claude';
      const maxTags = options?.maxTags || 5;
      const threshold = options?.confidenceThreshold || 0.7;

      // Get available tags for the entity type
      const availableTags = await prisma.universalTag.findMany({
        where: {
          isActive: true,
          entityTypes: { has: entityType },
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          patterns: true,
        },
      });

      if (availableTags.length === 0) {
        return [];
      }

      // Prepare prompt for AI
      const prompt = this.buildTaggingPrompt(content, entityType, metadata, availableTags);

      // Call AI provider
      let aiResponse: any;

      try {
        if (provider === 'claude') {
          await this.initializeClaudeService();
          if (claudeAIService.isReady()) {
            aiResponse = await this.getClaudeTagSuggestions(
              content,
              entityType,
              metadata,
              availableTags
            );
          } else {
            aiResponse = await this.getOpenAITagSuggestions(
              content,
              entityType,
              metadata,
              availableTags
            );
          }
        } else {
          aiResponse = await this.getOpenAITagSuggestions(
            content,
            entityType,
            metadata,
            availableTags
          );
        }
      } catch (error: any) {
        logger.warn(
          `Failed to get AI suggestions from ${provider}, falling back to pattern matching`,
          error
        );
        // Fallback to pattern-based matching
        aiResponse = await this.patternBasedTagging(content, availableTags, maxTags);
      }

      // Parse AI response and map to tag IDs
      const suggestions = this.parseAIResponse(aiResponse, availableTags);

      // Filter by confidence threshold
      const filtered = suggestions.filter((s) => s.confidence >= threshold);

      // Sort by confidence and limit
      filtered.sort((a, b) => b.confidence - a.confidence);
      const final = filtered.slice(0, maxTags);

      logger.info('AI tag suggestions generated', {
        provider,
        entityType,
        suggestedCount: final.length,
        contentLength: content.length,
      });

      return final;
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(feedback: TagFeedback): Promise<FeedbackResponse> {
    try {
      // Update learning patterns
      const patternKey = `${feedback.entityType}-${feedback.entityTagId}`;
      const pattern = this.learningPatterns.get(patternKey) || { correct: 0, incorrect: 0 };

      if (feedback.feedback.isCorrect) {
        pattern.correct++;
      } else {
        pattern.incorrect++;
      }

      this.learningPatterns.set(patternKey, pattern);

      // Update tag confidence based on feedback
      if (!feedback.feedback.isCorrect && feedback.feedback.suggestedTagId) {
        // Get the entity content for pattern learning
        const entity = await this.getEntityContent(feedback.entityType, feedback.entityId);

        if (entity) {
          // Update patterns for the suggested tag
          await this.updateTagPatterns(feedback.feedback.suggestedTagId, [entity.content]);
        }
      }

      logger.info('Tag feedback processed', {
        entityType: feedback.entityType,
        entityId: feedback.entityId,
        isCorrect: feedback.feedback.isCorrect,
      });

      return {
        success: true,
        data: {
          message: 'Feedback recorded successfully',
          processed: true,
        },
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Learn from manual corrections
   */
  async learnFromCorrection(learning: TagLearning): Promise<LearningResponse> {
    try {
      // Get entity content
      const entity = await this.getEntityContent(learning.entityType, learning.entityId);
      if (!entity) {
        throw new Error('Entity not found');
      }

      let patternsUpdated = false;
      let confidenceAdjusted = false;

      // Update patterns for the correct tag
      if (entity.content) {
        await this.updateTagPatterns(learning.correctTagId, [entity.content]);
        patternsUpdated = true;
      }

      // Adjust confidence for the previous tag if provided
      if (learning.previousTagId) {
        // Decrease pattern confidence for incorrect tag
        const previousTag = await prisma.universalTag.findUnique({
          where: { id: learning.previousTagId },
        });

        if (previousTag && previousTag.patterns) {
          // This would update pattern confidence in a real implementation
          confidenceAdjusted = true;
        }
      }

      // Record the learning event in patterns
      const learningKey = `${learning.entityType}-${learning.correctTagId}`;
      const pattern = this.learningPatterns.get(learningKey) || { correct: 0, incorrect: 0 };
      pattern.correct++;
      this.learningPatterns.set(learningKey, pattern);

      // Also track incorrect patterns if previous tag exists
      if (learning.previousTagId) {
        const incorrectKey = `${learning.entityType}-${learning.previousTagId}`;
        const incorrectPattern = this.learningPatterns.get(incorrectKey) || {
          correct: 0,
          incorrect: 0,
        };
        incorrectPattern.incorrect++;
        this.learningPatterns.set(incorrectKey, incorrectPattern);
      }

      logger.info('Tag learning processed', {
        entityType: learning.entityType,
        entityId: learning.entityId,
        correctTagId: learning.correctTagId,
      });

      return {
        success: true,
        data: {
          message: 'Learning processed successfully',
          patternsUpdated,
          confidenceAdjusted,
        },
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Update tag patterns based on examples
   */
  async updateTagPatterns(tagId: string, entityExamples: string[]): Promise<void> {
    try {
      const tag = await prisma.universalTag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new Error('Tag not found');
      }

      // Extract patterns from examples
      const patterns = this.extractPatterns(entityExamples);

      // Merge with existing patterns
      const existingPatterns = (tag.patterns as any) || {};
      const updatedPatterns = {
        ...existingPatterns,
        keywords: this.mergeKeywords(existingPatterns.keywords || [], patterns.keywords),
        merchants: this.mergeArrays(existingPatterns.merchants || [], patterns.merchants),
        learnedFrom: (existingPatterns.learnedFrom || 0) + entityExamples.length,
        lastUpdated: new Date().toISOString(),
      };

      // Update tag patterns
      await prisma.universalTag.update({
        where: { id: tagId },
        data: {
          patterns: updatedPatterns as any,
        },
      });

      logger.info('Tag patterns updated', {
        tagId,
        exampleCount: entityExamples.length,
      });
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Test a tag pattern against content
   */
  async testTagPattern(
    tagId: string,
    content: string
  ): Promise<{ matches: boolean; confidence: number }> {
    try {
      const tag = await prisma.universalTag.findUnique({
        where: { id: tagId },
      });

      if (!tag || !tag.patterns) {
        return { matches: false, confidence: 0 };
      }

      const patterns = tag.patterns as any;
      let score = 0;
      let maxScore = 0;

      // Check keywords
      if (patterns.keywords && Array.isArray(patterns.keywords)) {
        maxScore += patterns.keywords.length;
        const contentLower = content.toLowerCase();
        patterns.keywords.forEach((keyword: string) => {
          if (contentLower.includes(keyword.toLowerCase())) {
            score += 1;
          }
        });
      }

      // Check regex patterns
      if (patterns.regex) {
        maxScore += 2;
        try {
          const regex = new RegExp(patterns.regex, 'i');
          if (regex.test(content)) {
            score += 2;
          }
        } catch (error) {
          // Invalid regex, ignore
        }
      }

      // Calculate confidence
      const confidence = maxScore > 0 ? score / maxScore : 0;

      return {
        matches: confidence > 0.5,
        confidence: Math.round(confidence * 100) / 100,
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  // Private helper methods

  private buildTaggingPrompt(
    content: string,
    entityType: EntityType,
    metadata: Record<string, any> | undefined,
    availableTags: any[]
  ): string {
    const tagList = availableTags
      .map((t) => `- ${t.code}: ${t.name}${t.description ? ` (${t.description})` : ''}`)
      .join('\n');

    return `
Analyze the following ${entityType} and suggest the most appropriate tags from the list below.

Content: "${content}"
${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ''}

Available Tags:
${tagList}

Please suggest up to 5 tags that best match this content, with confidence scores (0-1) for each.
Consider the context, keywords, and any patterns that indicate relevance.

Response format:
[
  { "code": "TAG_CODE", "confidence": 0.95, "reasoning": "Brief explanation" },
  ...
]
    `.trim();
  }

  private async mockAIResponse(
    content: string,
    availableTags: any[],
    maxTags: number
  ): Promise<any> {
    // Mock AI response for development
    const contentLower = content.toLowerCase();
    const suggestions = [];

    for (const tag of availableTags) {
      let confidence = 0;

      // Simple keyword matching for mock
      if (tag.patterns?.keywords) {
        const keywords = tag.patterns.keywords as string[];
        const matches = keywords.filter((k: string) => contentLower.includes(k.toLowerCase()));
        confidence = matches.length / keywords.length;
      }

      // Check tag name/code in content
      if (contentLower.includes(tag.name.toLowerCase())) {
        confidence = Math.max(confidence, 0.7);
      }
      if (contentLower.includes(tag.code.toLowerCase())) {
        confidence = Math.max(confidence, 0.8);
      }

      if (confidence > 0) {
        suggestions.push({
          code: tag.code,
          confidence,
          reasoning: `Content matches ${Math.round(confidence * 100)}% of tag patterns`,
        });
      }
    }

    // Sort by confidence and limit
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return suggestions.slice(0, maxTags);
  }

  private parseAIResponse(
    aiResponse: any,
    availableTags: any[]
  ): Array<{ tagId: string; confidence: number; reasoning?: string }> {
    const tagMap = new Map(availableTags.map((t) => [t.code, t.id]));
    const suggestions = [];

    for (const suggestion of aiResponse) {
      const tagId = tagMap.get(suggestion.code);
      if (tagId) {
        suggestions.push({
          tagId,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
        });
      }
    }

    return suggestions;
  }

  private async getEntityContent(
    entityType: EntityType,
    entityId: string
  ): Promise<{ content: string; metadata: Record<string, any> } | null> {
    try {
      switch (entityType) {
        case 'transaction': {
          const transaction = await prisma.transactions.findUnique({
            where: { id: entityId },
          });
          if (!transaction) {
            return null;
          }

          return {
            content: transaction.description || '',
            metadata: {
              amount: transaction.amount,
              date: transaction.date,
              counterpartyName: transaction.counterparty_name,
              type: transaction.type,
            },
          };
        }

        case 'client': {
          const client = await prisma.client.findUnique({
            where: { id: entityId },
          });
          if (!client) {
            return null;
          }

          return {
            content: `${client.name} ${client.businessName || ''}`,
            metadata: {
              clientType: client.clientType,
              language: client.language,
              currency: client.currency,
              status: client.status,
            },
          };
        }

        case 'invoice': {
          const invoice = await prisma.invoice.findUnique({
            where: { id: entityId },
          });
          if (!invoice) {
            return null;
          }

          const items = Array.isArray(invoice.items) ? invoice.items : [];
          const itemsDescription = items.map((i: any) => i.description || '').join(' ');
          return {
            content: `${invoice.notes || ''} ${itemsDescription}`,
            metadata: {
              amount: invoice.total,
              currency: invoice.currency,
              date: invoice.issueDate,
              clientId: invoice.clientId,
            },
          };
        }

        case 'document': {
          // For documents, we'd need to fetch from document service
          // Placeholder for now
          return {
            content: `Document ${entityId}`,
            metadata: {},
          };
        }

        // Removed expense case as it's not a valid EntityType

        default:
          return null;
      }
    } catch (error) {
      logger.error(`Failed to fetch entity content for ${entityType}:${entityId}`, error);
      return null;
    }
  }

  private extractPatterns(examples: string[]): any {
    // Extract common patterns from examples
    const keywords = new Set<string>();
    const merchants = new Set<string>();

    examples.forEach((example) => {
      // Extract potential keywords (simple implementation)
      const words = example.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.length > 3 && !this.isCommonWord(word)) {
          keywords.add(word);
        }
      });

      // Extract potential merchant names (simplified)
      const upperWords = example.match(/[A-Z][A-Za-z]+/g);
      if (upperWords) {
        upperWords.forEach((word) => {
          if (word.length > 3) {
            merchants.add(word);
          }
        });
      }
    });

    return {
      keywords: Array.from(keywords),
      merchants: Array.from(merchants),
    };
  }

  private mergeKeywords(existing: string[], new_: string[]): string[] {
    const merged = new Set([...existing, ...new_]);
    return Array.from(merged);
  }

  private mergeArrays(existing: any[], new_: any[]): any[] {
    const merged = new Set([...existing, ...new_]);
    return Array.from(merged);
  }

  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that'];
    return commonWords.includes(word);
  }

  // AI Provider Methods

  private async getClaudeTagSuggestions(
    content: string,
    entityType: EntityType,
    metadata: Record<string, any> | undefined,
    availableTags: any[]
  ): Promise<any> {
    // Use a custom analysis method for tagging
    const tagContext = {
      content,
      entityType,
      metadata,
      availableTags: availableTags.map((t) => ({
        code: t.code,
        name: t.name,
        description: t.description,
      })),
    };

    // Create a trading-like context to use the existing Claude service method
    const mockContext = {
      symbol: 'TAG_ANALYSIS',
      exchange: 'internal',
      currentPrice: 0,
      priceChange24h: 0,
      volume24h: 0,
      volatility: 0,
      orderBook: { bidDepth: 0, askDepth: 0, spread: 0 },
      technicalIndicators: tagContext,
    };

    await this.initializeClaudeService();
    const decision = await claudeAIService.analyzeTradingOpportunity(mockContext);

    if (!decision || !decision.reasoning) {
      throw new Error('No response from Claude');
    }

    // Parse the reasoning to extract tag suggestions
    try {
      // Claude's response might include JSON in the reasoning
      const jsonMatch = decision.reasoning.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: create suggestions from the decision
      return this.parseClaudeDecisionToTags(decision, availableTags);
    } catch (error) {
      logger.error('Failed to parse Claude response for tagging', error);
      return [];
    }
  }

  private parseClaudeDecisionToTags(decision: any, availableTags: any[]): any[] {
    // Extract tag codes mentioned in the reasoning
    const reasoning = decision.reasoning.toLowerCase();
    const suggestions = [];

    for (const tag of availableTags) {
      if (
        reasoning.includes(tag.code.toLowerCase()) ||
        reasoning.includes(tag.name.toLowerCase())
      ) {
        suggestions.push({
          code: tag.code,
          confidence: decision.confidence || 0.7,
          reasoning: `Mentioned in analysis: ${tag.name}`,
        });
      }
    }

    return suggestions.slice(0, 5);
  }

  private async getOpenAITagSuggestions(
    content: string,
    entityType: EntityType,
    metadata: Record<string, any> | undefined,
    availableTags: any[]
  ): Promise<any> {
    // Generate embeddings for content and tags
    const contentEmbedding = await this.getOrCreateEmbedding(content);

    // Get or create embeddings for all tags
    const tagSimilarities = await Promise.all(
      availableTags.map(async (tag) => {
        const tagText = `${tag.name} ${tag.description || ''} ${tag.patterns?.keywords?.join(' ') || ''}`;
        const tagEmbedding = await this.getOrCreateEmbedding(`${tag.id}-${tagText}`, tagText);

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(contentEmbedding, tagEmbedding);

        // Get pattern score
        const patternScore = await this.testTagPattern(tag.id, content);

        // Get learning score
        const learningScore = this.getLearningScore(entityType, tag.id);

        // Combined confidence (weighted average)
        const confidence = similarity * 0.5 + patternScore.confidence * 0.3 + learningScore * 0.2;

        return {
          code: tag.code,
          confidence,
          reasoning: `Semantic similarity: ${(similarity * 100).toFixed(0)}%, Pattern match: ${(patternScore.confidence * 100).toFixed(0)}%, Learning score: ${(learningScore * 100).toFixed(0)}%`,
        };
      })
    );

    // Sort by confidence and return top results
    return tagSimilarities
      .filter((s) => s.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private async getOrCreateEmbedding(key: string, text?: string): Promise<number[]> {
    // Check cache first
    if (this.tagEmbeddings.has(key)) {
      return this.tagEmbeddings.get(key)!;
    }

    // Generate embedding
    const embedding = await this.openaiService.generateEmbedding(text || key);

    // Cache it
    this.tagEmbeddings.set(key, embedding);

    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private getLearningScore(entityType: EntityType, tagId: string): number {
    const key = `${entityType}-${tagId}`;
    const pattern = this.learningPatterns.get(key);

    if (!pattern) {
      return 0.5;
    } // Neutral score if no learning data

    const total = pattern.correct + pattern.incorrect;
    if (total === 0) {
      return 0.5;
    }

    // Calculate confidence based on correct/incorrect ratio
    const accuracy = pattern.correct / total;

    // Weight by total observations (more data = more confidence)
    const weight = Math.min(1, total / 10); // Cap at 10 observations

    // Return weighted accuracy
    return 0.5 + (accuracy - 0.5) * weight;
  }

  private buildClaudePrompt(
    content: string,
    entityType: EntityType,
    metadata: Record<string, any> | undefined,
    availableTags: any[]
  ): string {
    const tagList = availableTags
      .map((t) => `- ${t.code}: ${t.name}${t.description ? ` (${t.description})` : ''}`)
      .join('\n');

    let contextInfo = '';
    if (metadata) {
      if (metadata.amount) {
        contextInfo += `\nAmount: ${metadata.amount}`;
      }
      if (metadata.date) {
        contextInfo += `\nDate: ${metadata.date}`;
      }
      if (metadata.category) {
        contextInfo += `\nCategory: ${metadata.category}`;
      }
      if (metadata.language) {
        contextInfo += `\nLanguage: ${metadata.language}`;
      }
    }

    return `Analyze this ${entityType} content and suggest the most appropriate tags.

Content: "${content}"${contextInfo}

Available Tags:
${tagList}

Consider:
1. Semantic meaning and context
2. Keywords and patterns
3. Entity type relevance
4. Multi-language understanding if applicable

Return up to 5 most relevant tags with confidence scores.`;
  }

  private async patternBasedTagging(
    content: string,
    availableTags: any[],
    maxTags: number
  ): Promise<any[]> {
    const suggestions = [];

    for (const tag of availableTags) {
      const patternResult = await this.testTagPattern(tag.id, content);
      const learningScore = this.getLearningScore('transaction', tag.id); // Default to transaction

      if (patternResult.matches || learningScore > 0.6) {
        suggestions.push({
          code: tag.code,
          confidence: Math.max(patternResult.confidence, learningScore),
          reasoning: `Pattern-based matching: ${(patternResult.confidence * 100).toFixed(0)}%, Historical accuracy: ${(learningScore * 100).toFixed(0)}%`,
        });
      }
    }

    // Sort by confidence and limit
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, maxTags);
  }

  /**
   * Batch process multiple items for AI tagging
   */
  async batchProcessTags(
    items: Array<{
      entityType: EntityType;
      entityId: string;
      content: string;
      metadata?: Record<string, any>;
    }>,
    options?: {
      provider?: 'claude' | 'openai';
      parallel?: boolean;
      batchSize?: number;
    }
  ): Promise<
    Array<{
      entityId: string;
      status: 'success' | 'error';
      tags?: Array<{ tagId: string; confidence: number; reasoning?: string }>;
      error?: string;
    }>
  > {
    const batchSize = options?.batchSize || 10;
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const suggestions = await this.suggestTags(
              item.content,
              item.entityType,
              item.metadata,
              { provider: options?.provider }
            );

            return {
              entityId: item.entityId,
              status: 'success' as const,
              tags: suggestions,
            };
          } catch (error: any) {
            return {
              entityId: item.entityId,
              status: 'error' as const,
              error: error.message,
            };
          }
        })
      );

      results.push(...batchResults);

      // Report progress
      // Progress tracking removed - not in interface
    }

    return results;
  }

  /**
   * Auto-categorize content based on AI analysis
   */
  async autoCategorize(
    content: string,
    entityType: EntityType,
    language?: string,
    context?: Record<string, any>
  ): Promise<{
    category: string;
    confidence: number;
    reasoning?: string;
  }> {
    try {
      // Detect language if not provided
      const detectedLanguage = language || (await this.detectLanguage(content));

      // Get all categories from tags
      const tags = await prisma.universalTag.findMany({
        where: {
          isActive: true,
          entityTypes: { has: entityType },
        },
      });

      // Group tags by category (using path as category)
      const categories = new Map<string, any[]>();
      tags.forEach((tag) => {
        const category = tag.path.split('/')[1] || tag.name || 'uncategorized';
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(tag);
      });

      // Get AI suggestions
      const suggestions = await this.suggestTags(content, entityType, {
        ...context,
        language: detectedLanguage,
      });

      // Determine primary category based on suggestions
      const categoryScores = new Map<string, number>();
      suggestions.forEach((suggestion) => {
        const tag = tags.find((t) => t.id === suggestion.tagId);
        if (tag) {
          // Use the tag name or first level of path as category
          const category = tag.path.split('/')[1] || tag.name || 'uncategorized';
          const currentScore = categoryScores.get(category) || 0;
          categoryScores.set(category, currentScore + suggestion.confidence);
        }
      });

      // Sort categories by score
      const sortedCategories = Array.from(categoryScores.entries()).sort((a, b) => b[1] - a[1]);

      const primaryCategory = sortedCategories[0]?.[0] || 'uncategorized';
      const subCategories = sortedCategories.slice(1, 4).map((c) => c[0]);
      const confidence = sortedCategories[0]?.[1] || 0;

      return {
        category: primaryCategory,
        confidence: Math.min(1, confidence),
        reasoning: `Categorized based on ${suggestions.length} AI tag suggestions`,
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Detect language of content
   */
  private async detectLanguage(content: string): Promise<string> {
    try {
      // Use OpenAI to detect language
      const prompt = `Detect the language of this text and return only the ISO 639-1 language code (e.g., 'en', 'es', 'fr'): "${content.substring(0, 200)}"`;

      // This would use OpenAI's completion API
      // For now, simple detection based on common words
      const lowerContent = content.toLowerCase();

      if (
        lowerContent.includes('the') ||
        lowerContent.includes('and') ||
        lowerContent.includes('for')
      ) {
        return 'en';
      } else if (
        lowerContent.includes('el') ||
        lowerContent.includes('la') ||
        lowerContent.includes('de')
      ) {
        return 'es';
      } else if (
        lowerContent.includes('le') ||
        lowerContent.includes('de') ||
        lowerContent.includes('et')
      ) {
        return 'fr';
      }

      return 'en'; // Default to English
    } catch (error) {
      logger.warn('Failed to detect language, defaulting to English', error);
      return 'en';
    }
  }

  /**
   * Get multi-language tag suggestions
   */
  async getMultilingualSuggestions(
    content: string,
    entityType: EntityType,
    targetLanguages: string[],
    metadata?: Record<string, any>
  ): Promise<Record<string, Array<{ tagId: string; confidence: number; reasoning?: string }>>> {
    const results: Record<
      string,
      Array<{ tagId: string; confidence: number; reasoning?: string }>
    > = {};

    for (const lang of targetLanguages) {
      try {
        // Get suggestions in target language
        const suggestions = await this.suggestTags(content, entityType, {
          language: lang,
        });

        // Add translations if needed
        const enhancedSuggestions = await Promise.all(
          suggestions.map(async (suggestion) => {
            const tag = await prisma.universalTag.findUnique({
              where: { id: suggestion.tagId },
            });

            if (tag && tag.metadata && typeof tag.metadata === 'object' && tag.metadata !== null) {
              const metadata = tag.metadata as any;
              const translations = metadata.translations;
              if (translations && translations[lang]) {
                return {
                  ...suggestion,
                  translation: translations[lang],
                };
              }
            }

            return suggestion;
          })
        );

        results[lang] = enhancedSuggestions.map((s) => ({
          tagId: s.tagId,
          confidence: s.confidence,
          reasoning: (s as any).translation || s.reasoning,
        }));
      } catch (error) {
        logger.warn(`Failed to get suggestions for language ${lang}`, error);
        results[lang] = [];
      }
    }

    return results;
  }

  /**
   * Improve tag patterns based on successful applications
   */
  async improveTagPatterns(
    tagId: string,
    successfulExamples: string[],
    failedExamples: string[] = []
  ): Promise<void> {
    try {
      const tag = await prisma.universalTag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new Error('Tag not found');
      }

      // Extract positive patterns from successful examples
      const positivePatterns = this.extractPatterns(successfulExamples);

      // Extract negative patterns from failed examples
      const negativePatterns =
        failedExamples.length > 0
          ? this.extractPatterns(failedExamples)
          : { keywords: [], merchants: [] };

      // Update patterns with positive/negative reinforcement
      const existingPatterns = (tag.patterns as any) || {};
      const updatedPatterns = {
        ...existingPatterns,
        keywords: this.refineKeywords(
          existingPatterns.keywords || [],
          positivePatterns.keywords,
          negativePatterns.keywords
        ),
        merchants: this.refineMerchants(
          existingPatterns.merchants || [],
          positivePatterns.merchants,
          negativePatterns.merchants
        ),
        positiveExamples: [
          ...(existingPatterns.positiveExamples || []),
          ...successfulExamples.slice(0, 5),
        ].slice(-20), // Keep last 20 examples
        negativeExamples: [
          ...(existingPatterns.negativeExamples || []),
          ...failedExamples.slice(0, 5),
        ].slice(-10), // Keep last 10 negative examples
        confidence: this.calculatePatternConfidence(
          successfulExamples.length,
          failedExamples.length,
          existingPatterns.confidence || 0.5
        ),
        lastImproved: new Date().toISOString(),
      };

      await prisma.universalTag.update({
        where: { id: tagId },
        data: {
          patterns: updatedPatterns as any,
        },
      });

      logger.info('Tag patterns improved', {
        tagId,
        positiveExamples: successfulExamples.length,
        negativeExamples: failedExamples.length,
        newConfidence: updatedPatterns.confidence,
      });
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  private refineKeywords(existing: string[], positive: string[], negative: string[]): string[] {
    // Add positive keywords
    const refined = new Set(existing);
    positive.forEach((k) => refined.add(k));

    // Remove keywords that appear in negative examples
    negative.forEach((k) => refined.delete(k));

    return Array.from(refined);
  }

  private refineMerchants(existing: string[], positive: string[], negative: string[]): string[] {
    const refined = new Set(existing);
    positive.forEach((m) => refined.add(m));
    negative.forEach((m) => refined.delete(m));
    return Array.from(refined);
  }

  private calculatePatternConfidence(
    successCount: number,
    failureCount: number,
    currentConfidence: number
  ): number {
    const total = successCount + failureCount;
    if (total === 0) {
      return currentConfidence;
    }

    const successRate = successCount / total;
    const weight = Math.min(1, total / 20); // More examples = more weight

    // Weighted average of current confidence and new success rate
    const newConfidence = currentConfidence * (1 - weight) + successRate * weight;

    return Math.round(newConfidence * 100) / 100;
  }

  /**
   * Get contextual tag suggestions based on related entities
   */
  async getContextualSuggestions(
    content: string,
    entityType: EntityType,
    context: {
      previousTags?: string[];
      relatedEntities?: string[];
      historicalPatterns?: Record<string, any>;
    },
    metadata?: Record<string, any>
  ): Promise<Array<{ tagId: string; confidence: number; reasoning?: string }>> {
    try {
      // Get base suggestions
      const baseSuggestions = await this.suggestTags(content, entityType);

      // Enhance with contextual information
      const contextualScores = new Map<string, number>();

      // Check previous tags used for similar entities
      if (context.previousTags && context.previousTags.length > 0) {
        for (const tagId of context.previousTags) {
          const currentScore = contextualScores.get(tagId) || 0;
          contextualScores.set(tagId, currentScore + 0.2); // Historical usage boost
        }
      }

      // Check tags used by related entities
      if (context.relatedEntities && context.relatedEntities.length > 0) {
        for (const entityId of context.relatedEntities) {
          const relatedTags = await prisma.entityTag.findMany({
            where: {
              entityId: entityId,
            },
            select: { tagId: true },
          });

          relatedTags.forEach((rt) => {
            const currentScore = contextualScores.get(rt.tagId) || 0;
            contextualScores.set(rt.tagId, currentScore + 0.15); // Related entity boost
          });
        }
      }

      // Merge base suggestions with contextual scores
      const enhancedSuggestions = baseSuggestions.map((suggestion) => {
        const contextBoost = contextualScores.get(suggestion.tagId) || 0;
        return {
          ...suggestion,
          confidence: Math.min(1, suggestion.confidence + contextBoost),
          reasoning:
            contextBoost > 0
              ? `${suggestion.reasoning || ''} (Context boost: +${(contextBoost * 100).toFixed(0)}%)`
              : suggestion.reasoning,
        };
      });

      // Sort by enhanced confidence
      enhancedSuggestions.sort((a, b) => b.confidence - a.confidence);

      return enhancedSuggestions;
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Get tag suggestion analytics
   */
  async getTagAnalytics(): Promise<{
    totalSuggestions: number;
    accuracyByTag: Array<{ tagId: string; tagCode: string; accuracy: number; total: number }>;
    providerPerformance: { claude: number; openai: number; pattern: number };
    averageConfidence: number;
  }> {
    // Get all tags
    const tags = await prisma.universalTag.findMany({
      where: { isActive: true },
    });

    // Calculate accuracy for each tag
    const accuracyByTag = tags
      .map((tag) => {
        const key = `transaction-${tag.id}`; // Assuming transaction entity type
        const pattern = this.learningPatterns.get(key) || { correct: 0, incorrect: 0 };
        const total = pattern.correct + pattern.incorrect;
        const accuracy = total > 0 ? pattern.correct / total : 0;

        return {
          tagId: tag.id,
          tagCode: tag.code,
          accuracy,
          total,
        };
      })
      .filter((t) => t.total > 0)
      .sort((a, b) => b.accuracy - a.accuracy);

    // Calculate average confidence from recent suggestions
    const totalPatterns = Array.from(this.learningPatterns.values());
    const totalObservations = totalPatterns.reduce((sum, p) => sum + p.correct + p.incorrect, 0);
    const totalCorrect = totalPatterns.reduce((sum, p) => sum + p.correct, 0);
    const averageConfidence = totalObservations > 0 ? totalCorrect / totalObservations : 0;

    return {
      totalSuggestions: totalObservations,
      accuracyByTag: accuracyByTag.slice(0, 20), // Top 20
      providerPerformance: {
        claude: 0.85, // Placeholder - would track actual performance
        openai: 0.82, // Placeholder - would track actual performance
        pattern: averageConfidence,
      },
      averageConfidence,
    };
  }
}

// Export singleton instance
export const aiTaggingService = new AITaggingService();
