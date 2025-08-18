import { injectable } from 'inversify';
import { prisma } from '../../lib/prisma';
import { EntityType } from '../../types/tagging/tag.types';
import { IPatternMatchingService } from './interfaces';
import { handleTaggingError } from './errors';
import logger from '../../utils/logger';
import crypto from 'crypto';

@injectable()
export class PatternMatchingService implements IPatternMatchingService {
  private patternCache: Map<string, Array<{ tagId: string; confidence: number }>> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  /**
   * Match patterns against content
   */
  async matchPatterns(
    content: string,
    entityType: EntityType,
    metadata?: Record<string, any>
  ): Promise<Array<{ tagId: string; confidence: number; matchedPattern: string }>> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(content, entityType, metadata);

      // Check cache
      const cached = this.patternCache.get(cacheKey);
      if (cached) {
        logger.debug('Pattern match cache hit', { cacheKey });
        return cached.map((c) => ({ ...c, matchedPattern: 'cached' }));
      }

      // Get active tags with patterns for this entity type
      const tagsWithPatterns = await prisma.universalTag.findMany({
        where: {
          isActive: true,
          entityTypes: { has: entityType },
          patterns: { not: { equals: null } },
        },
      });

      const matches: Array<{ tagId: string; confidence: number; matchedPattern: string }> = [];

      for (const tag of tagsWithPatterns) {
        const patterns = tag.patterns as any;
        if (!patterns) {
          continue;
        }

        const matchResult = this.evaluatePatterns(content, metadata, patterns);
        if (matchResult.matches) {
          matches.push({
            tagId: tag.id,
            confidence: matchResult.confidence,
            matchedPattern: matchResult.matchedPattern,
          });
        }
      }

      // Sort by confidence
      matches.sort((a, b) => b.confidence - a.confidence);

      // Cache results
      this.cachePatternMatch(cacheKey, matches);

      logger.info('Pattern matching completed', {
        entityType,
        contentLength: content.length,
        matchCount: matches.length,
      });

      return matches;
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Validate a pattern string
   */
  async validatePattern(pattern: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Try to create a RegExp from the pattern
      new RegExp(pattern);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: `Invalid regex pattern: ${error.message}`,
      };
    }
  }

  /**
   * Batch match patterns for multiple entities
   */
  async batchMatchPatterns(
    entities: Array<{ id: string; content: string; metadata?: Record<string, any> }>,
    entityType: EntityType
  ): Promise<Map<string, Array<{ tagId: string; confidence: number }>>> {
    try {
      // Get all relevant tags once
      const tagsWithPatterns = await prisma.universalTag.findMany({
        where: {
          isActive: true,
          entityTypes: { has: entityType },
          patterns: { not: { equals: null } },
        },
      });

      const results = new Map<string, Array<{ tagId: string; confidence: number }>>();

      // Process each entity
      for (const entity of entities) {
        const matches: Array<{ tagId: string; confidence: number }> = [];

        for (const tag of tagsWithPatterns) {
          const patterns = tag.patterns as any;
          if (!patterns) {
            continue;
          }

          const matchResult = this.evaluatePatterns(entity.content, entity.metadata, patterns);
          if (matchResult.matches) {
            matches.push({
              tagId: tag.id,
              confidence: matchResult.confidence,
            });
          }
        }

        // Sort by confidence
        matches.sort((a, b) => b.confidence - a.confidence);
        results.set(entity.id, matches);
      }

      logger.info('Batch pattern matching completed', {
        entityType,
        entityCount: entities.length,
        totalMatches: Array.from(results.values()).reduce((sum, m) => sum + m.length, 0),
      });

      return results;
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  // Private helper methods

  private evaluatePatterns(
    content: string,
    metadata: Record<string, any> | undefined,
    patterns: any
  ): { matches: boolean; confidence: number; matchedPattern: string } {
    const contentLower = content.toLowerCase();
    const scores: Array<{ type: string; score: number; maxScore: number }> = [];

    // Keyword matching
    if (patterns.keywords && Array.isArray(patterns.keywords)) {
      const keywordMatches = patterns.keywords.filter((keyword: string) =>
        contentLower.includes(keyword.toLowerCase())
      );

      scores.push({
        type: 'keywords',
        score: keywordMatches.length,
        maxScore: patterns.keywords.length,
      });

      if (keywordMatches.length > 0) {
        return {
          matches: true,
          confidence: keywordMatches.length / patterns.keywords.length,
          matchedPattern: `keywords: ${keywordMatches.join(', ')}`,
        };
      }
    }

    // Merchant matching (for transactions)
    if (patterns.merchants && Array.isArray(patterns.merchants) && metadata?.counterpartyName) {
      const merchantLower = metadata.counterpartyName.toLowerCase();
      const merchantMatch = patterns.merchants.find((merchant: string) =>
        merchantLower.includes(merchant.toLowerCase())
      );

      if (merchantMatch) {
        return {
          matches: true,
          confidence: 0.9,
          matchedPattern: `merchant: ${merchantMatch}`,
        };
      }
    }

    // Regex matching
    if (patterns.regex) {
      try {
        const regex = new RegExp(patterns.regex, 'i');
        if (regex.test(content)) {
          return {
            matches: true,
            confidence: 0.85,
            matchedPattern: `regex: ${patterns.regex}`,
          };
        }
      } catch (error) {
        // Invalid regex, skip
      }
    }

    // Amount range matching (for transactions)
    if (patterns.amountRange && metadata?.amount) {
      const amount = Math.abs(metadata.amount);
      const { min, max } = patterns.amountRange;

      if ((min === undefined || amount >= min) && (max === undefined || amount <= max)) {
        return {
          matches: true,
          confidence: 0.8,
          matchedPattern: `amount: ${min || 0} - ${max || '∞'}`,
        };
      }
    }

    // Category matching
    if (patterns.categories && Array.isArray(patterns.categories) && metadata?.category) {
      const categoryMatch = patterns.categories.includes(metadata.category);
      if (categoryMatch) {
        return {
          matches: true,
          confidence: 0.75,
          matchedPattern: `category: ${metadata.category}`,
        };
      }
    }

    // Custom rules (JSON-based conditions)
    if (patterns.customRules) {
      const ruleResult = this.evaluateCustomRules(content, metadata, patterns.customRules);
      if (ruleResult.matches) {
        return {
          matches: true,
          confidence: ruleResult.confidence,
          matchedPattern: `custom rule: ${ruleResult.rule}`,
        };
      }
    }

    // No matches
    return {
      matches: false,
      confidence: 0,
      matchedPattern: '',
    };
  }

  private evaluateCustomRules(
    content: string,
    metadata: Record<string, any> | undefined,
    rules: any
  ): { matches: boolean; confidence: number; rule: string } {
    // Simple custom rule evaluation
    // In a real implementation, this would be more sophisticated

    if (rules.contains && Array.isArray(rules.contains)) {
      const contentLower = content.toLowerCase();
      const allMatch = rules.contains.every((term: string) =>
        contentLower.includes(term.toLowerCase())
      );

      if (allMatch) {
        return {
          matches: true,
          confidence: 0.8,
          rule: `contains all: ${rules.contains.join(', ')}`,
        };
      }
    }

    if (rules.containsAny && Array.isArray(rules.containsAny)) {
      const contentLower = content.toLowerCase();
      const anyMatch = rules.containsAny.some((term: string) =>
        contentLower.includes(term.toLowerCase())
      );

      if (anyMatch) {
        return {
          matches: true,
          confidence: 0.7,
          rule: `contains any: ${rules.containsAny.join(', ')}`,
        };
      }
    }

    return {
      matches: false,
      confidence: 0,
      rule: '',
    };
  }

  private generateCacheKey(
    content: string,
    entityType: EntityType,
    metadata?: Record<string, any>
  ): string {
    const hash = crypto.createHash('md5');
    hash.update(content);
    hash.update(entityType);
    if (metadata) {
      hash.update(JSON.stringify(metadata));
    }
    return hash.digest('hex');
  }

  private cachePatternMatch(
    key: string,
    matches: Array<{ tagId: string; confidence: number; matchedPattern: string }>
  ): void {
    // Store without matchedPattern to save memory
    const cacheData = matches.map((m) => ({
      tagId: m.tagId,
      confidence: m.confidence,
    }));

    this.patternCache.set(key, cacheData);

    // Set timeout to clear cache
    setTimeout(() => {
      this.patternCache.delete(key);
    }, this.cacheTimeout);

    // Limit cache size
    if (this.patternCache.size > 1000) {
      const firstKey = this.patternCache.keys().next().value;
      if (firstKey !== undefined) {
        this.patternCache.delete(firstKey);
      }
    }
  }
}
