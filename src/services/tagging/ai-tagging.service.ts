import { prisma } from '../../lib/prisma';
import { EntityType, TagFeedback, TagLearning } from '../../types/tagging/tag.types';
import { FeedbackResponse, LearningResponse } from '../../types/tagging/response.types';
import { IAITaggingService } from './interfaces';
import { AIProviderError, handleTaggingError } from './errors';
import logger from '../../utils/logger';
import crypto from 'crypto';

// Import AI providers (these would be your actual AI service implementations)
// import { ClaudeService } from '../ai/claude.service';
// import { OpenAIService } from '../ai/openai.service';

export class AITaggingService implements IAITaggingService {
  // private claudeService: ClaudeService;
  // private openaiService: OpenAIService;

  constructor() {
    // Initialize AI services
    // this.claudeService = new ClaudeService();
    // this.openaiService = new OpenAIService();
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
      const availableTags = await prisma.tag.findMany({
        where: {
          isActive: true,
          entityTypes: { has: entityType }
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          patterns: true
        }
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
          // aiResponse = await this.claudeService.complete(prompt);
          // For now, mock the response
          aiResponse = await this.mockAIResponse(content, availableTags, maxTags);
        } else {
          // aiResponse = await this.openaiService.complete(prompt);
          // For now, mock the response
          aiResponse = await this.mockAIResponse(content, availableTags, maxTags);
        }
      } catch (error: any) {
        throw new AIProviderError(provider, error.message);
      }

      // Parse AI response and map to tag IDs
      const suggestions = this.parseAIResponse(aiResponse, availableTags);

      // Filter by confidence threshold
      const filtered = suggestions.filter(s => s.confidence >= threshold);

      // Sort by confidence and limit
      filtered.sort((a, b) => b.confidence - a.confidence);
      const final = filtered.slice(0, maxTags);

      logger.info('AI tag suggestions generated', {
        provider,
        entityType,
        suggestedCount: final.length,
        contentLength: content.length
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
      // Store feedback for pattern learning
      await prisma.tagFeedback.create({
        data: {
          entityType: feedback.entityType,
          entityId: feedback.entityId,
          entityTagId: feedback.entityTagId,
          isCorrect: feedback.feedback.isCorrect,
          suggestedTagId: feedback.feedback.suggestedTagId,
          reason: feedback.feedback.reason,
          confidence: feedback.feedback.confidence,
          createdAt: new Date()
        }
      });

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
        isCorrect: feedback.feedback.isCorrect
      });

      return {
        success: true,
        data: {
          message: 'Feedback recorded successfully',
          processed: true
        }
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
        const previousTag = await prisma.tag.findUnique({
          where: { id: learning.previousTagId }
        });

        if (previousTag && previousTag.patterns) {
          // This would update pattern confidence in a real implementation
          confidenceAdjusted = true;
        }
      }

      // Record the learning event
      await prisma.tagLearningEvent.create({
        data: {
          entityType: learning.entityType,
          entityId: learning.entityId,
          correctTagId: learning.correctTagId,
          previousTagId: learning.previousTagId,
          context: learning.context as any,
          createdAt: new Date()
        }
      });

      logger.info('Tag learning processed', {
        entityType: learning.entityType,
        entityId: learning.entityId,
        correctTagId: learning.correctTagId
      });

      return {
        success: true,
        data: {
          message: 'Learning processed successfully',
          patternsUpdated,
          confidenceAdjusted
        }
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
      const tag = await prisma.tag.findUnique({
        where: { id: tagId }
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
        lastUpdated: new Date().toISOString()
      };

      // Update tag patterns
      await prisma.tag.update({
        where: { id: tagId },
        data: {
          patterns: updatedPatterns as any
        }
      });

      logger.info('Tag patterns updated', {
        tagId,
        exampleCount: entityExamples.length
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
      const tag = await prisma.tag.findUnique({
        where: { id: tagId }
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
        confidence: Math.round(confidence * 100) / 100
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
    const tagList = availableTags.map(t => 
      `- ${t.code}: ${t.name}${t.description ? ` (${t.description})` : ''}`
    ).join('\n');

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
        const matches = keywords.filter((k: string) => 
          contentLower.includes(k.toLowerCase())
        );
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
          reasoning: `Content matches ${Math.round(confidence * 100)}% of tag patterns`
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
    const tagMap = new Map(availableTags.map(t => [t.code, t.id]));
    const suggestions = [];

    for (const suggestion of aiResponse) {
      const tagId = tagMap.get(suggestion.code);
      if (tagId) {
        suggestions.push({
          tagId,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning
        });
      }
    }

    return suggestions;
  }

  private async getEntityContent(
    entityType: EntityType,
    entityId: string
  ): Promise<{ content: string; metadata: Record<string, any> } | null> {
    // This would fetch actual entity content based on type
    // For now, returning null
    return null;
  }

  private extractPatterns(examples: string[]): any {
    // Extract common patterns from examples
    const keywords = new Set<string>();
    const merchants = new Set<string>();

    examples.forEach(example => {
      // Extract potential keywords (simple implementation)
      const words = example.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !this.isCommonWord(word)) {
          keywords.add(word);
        }
      });

      // Extract potential merchant names (simplified)
      const upperWords = example.match(/[A-Z][A-Za-z]+/g);
      if (upperWords) {
        upperWords.forEach(word => {
          if (word.length > 3) {
            merchants.add(word);
          }
        });
      }
    });

    return {
      keywords: Array.from(keywords),
      merchants: Array.from(merchants)
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
}

// Export singleton instance
export const aiTaggingService = new AITaggingService();