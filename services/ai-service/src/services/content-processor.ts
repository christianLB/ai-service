import { Logger } from '../utils/logger';
import { route, executeChat } from '../core/router';
import { EntityExtractor } from './entity-extractor';
import Redis from 'ioredis';

export interface ContentAnalysis {
  id: string;
  type: ContentType;
  source: string;
  summary: string;
  topics: string[];
  entities: any[];
  metadata: Record<string, any>;
  storageLocation?: string;
  timestamp: string;
}

export enum ContentType {
  URL = 'url',
  DOCUMENT = 'document',
  IMAGE = 'image',
  TEXT = 'text',
  CODE = 'code',
  UNKNOWN = 'unknown'
}

export class ContentProcessor {
  private logger: Logger;
  private entityExtractor: EntityExtractor;
  private redis: Redis;

  constructor(redis: Redis) {
    this.logger = new Logger('ContentProcessor');
    this.entityExtractor = new EntityExtractor();
    this.redis = redis;
  }

  /**
   * Process content based on type
   */
  async process(content: string, metadata?: any): Promise<ContentAnalysis> {
    this.logger.info('Processing content');

    const contentType = this.detectContentType(content);
    const contentId = this.generateContentId();

    let analysis: ContentAnalysis = {
      id: contentId,
      type: contentType,
      source: content.substring(0, 200),
      summary: '',
      topics: [],
      entities: [],
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    switch (contentType) {
      case ContentType.URL:
        analysis = await this.processURL(content, analysis);
        break;
      case ContentType.DOCUMENT:
        analysis = await this.processDocument(content, analysis);
        break;
      case ContentType.IMAGE:
        analysis = await this.processImage(content, analysis);
        break;
      case ContentType.CODE:
        analysis = await this.processCode(content, analysis);
        break;
      case ContentType.TEXT:
      default:
        analysis = await this.processText(content, analysis);
        break;
    }

    // Store analysis result
    await this.storeAnalysis(analysis);

    this.logger.info(`Content processed: ${contentId}`);
    return analysis;
  }

  /**
   * Detect content type
   */
  private detectContentType(content: string): ContentType {
    // URL detection
    if (content.match(/^https?:\/\//i)) {
      return ContentType.URL;
    }

    // Document detection (file references)
    if (content.match(/\.(pdf|doc|docx|txt|md|csv|xlsx)$/i)) {
      return ContentType.DOCUMENT;
    }

    // Image detection
    if (content.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return ContentType.IMAGE;
    }

    // Code detection
    if (content.includes('```') || content.match(/function|class|const|let|var|def|import/)) {
      return ContentType.CODE;
    }

    // Long text
    if (content.length > 500) {
      return ContentType.TEXT;
    }

    return ContentType.TEXT;
  }

  /**
   * Process URL content
   */
  private async processURL(url: string, analysis: ContentAnalysis): Promise<ContentAnalysis> {
    try {
      // For now, we'll just analyze the URL itself
      // In production, this would fetch and process the URL content

      analysis.summary = `URL detected: ${url}`;
      analysis.metadata.url = url;
      analysis.metadata.domain = new URL(url).hostname;

      // Determine content type from URL
      if (url.includes('github.com')) {
        analysis.topics.push('code', 'development');
      } else if (url.includes('twitter.com') || url.includes('x.com')) {
        analysis.topics.push('social media', 'twitter');
      } else if (url.match(/\.(pdf|doc)/i)) {
        analysis.topics.push('document');
      }

      // Skip AI analysis for now to avoid provider issues
      // const aiAnalysis = await this.analyzeWithAI(
      //   `Analyze this URL and predict what content it might contain: ${url}`,
      //   'url_analysis'
      // );

      // if (aiAnalysis) {
      //   analysis.summary = aiAnalysis.summary || analysis.summary;
      //   analysis.topics = [...analysis.topics, ...(aiAnalysis.topics || [])];
      // }

    } catch (error) {
      this.logger.error('Failed to process URL:', error);
      analysis.metadata.error = error.message;
    }

    return analysis;
  }

  /**
   * Process document content
   */
  private async processDocument(content: string, analysis: ContentAnalysis): Promise<ContentAnalysis> {
    analysis.summary = 'Document reference detected';
    analysis.metadata.documentType = content.match(/\.(\w+)$/)?.[1] || 'unknown';

    // In production, this would:
    // 1. Download the document
    // 2. Extract text (PDF, DOC, etc.)
    // 3. Analyze content
    // 4. Store in content service

    return analysis;
  }

  /**
   * Process image content
   */
  private async processImage(content: string, analysis: ContentAnalysis): Promise<ContentAnalysis> {
    analysis.summary = 'Image reference detected';
    analysis.metadata.imageType = content.match(/\.(\w+)$/)?.[1] || 'unknown';

    // In production, this would:
    // 1. Download the image
    // 2. Run OCR if needed
    // 3. Use vision AI to describe
    // 4. Extract any text
    // 5. Store metadata

    return analysis;
  }

  /**
   * Process code content
   */
  private async processCode(content: string, analysis: ContentAnalysis): Promise<ContentAnalysis> {
    // Detect programming language
    let language = 'unknown';
    if (content.includes('function') || content.includes('const')) {
      language = 'javascript';
    } else if (content.includes('def ') || content.includes('import ')) {
      language = 'python';
    } else if (content.includes('pragma solidity')) {
      language = 'solidity';
    }

    analysis.metadata.language = language;
    analysis.topics.push('code', language);

    // Use AI to analyze the code
    const aiAnalysis = await this.analyzeWithAI(
      `Analyze this code and provide a brief summary:\n\n${content}`,
      'code_analysis'
    );

    if (aiAnalysis) {
      analysis.summary = aiAnalysis.summary || 'Code snippet';
      analysis.topics = [...analysis.topics, ...(aiAnalysis.topics || [])];
    }

    return analysis;
  }

  /**
   * Process text content
   */
  private async processText(content: string, analysis: ContentAnalysis): Promise<ContentAnalysis> {
    // Extract entities
    const entities = await this.entityExtractor.extract(content);
    analysis.entities = entities;

    // Use AI for analysis
    const aiAnalysis = await this.analyzeWithAI(content, 'text_analysis');

    if (aiAnalysis) {
      analysis.summary = aiAnalysis.summary;
      analysis.topics = aiAnalysis.topics || [];
      analysis.metadata = { ...analysis.metadata, ...aiAnalysis.metadata };
    }

    return analysis;
  }

  /**
   * Analyze content with AI
   */
  private async analyzeWithAI(
    content: string,
    analysisType: string
  ): Promise<{
    summary: string;
    topics: string[];
    metadata?: Record<string, any>;
  } | null> {
    try {
      const prompt = `
Analyze the following content and provide:
1. A brief summary (1-2 sentences)
2. Main topics/themes (3-5 keywords)
3. Key insights

Content: "${content.substring(0, 1000)}"

Return as JSON with fields: summary, topics (array), insights`;

      const decision = await route('chat.telegram', ['chat']);
      const result = await executeChat(decision, {
        messages: [
          { role: 'system', content: 'You are a content analysis specialist. Provide concise, accurate analysis.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        maxTokens: 300
      });

      if (!result.output) return null;

      // Parse AI response
      try {
        const jsonMatch = result.output.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return {
            summary: result.output.substring(0, 200),
            topics: []
          };
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || '',
          topics: parsed.topics || [],
          metadata: { insights: parsed.insights }
        };
      } catch (parseError) {
        this.logger.error('Failed to parse AI analysis:', parseError);
        return {
          summary: result.output.substring(0, 200),
          topics: []
        };
      }
    } catch (error) {
      this.logger.error('AI analysis failed:', error);
      return null;
    }
  }

  /**
   * Store analysis in content service
   */
  private async storeAnalysis(analysis: ContentAnalysis): Promise<void> {
    try {
      // Store in Redis Stream for content service
      await this.redis.xadd(
        'content.storage.request',
        '*',
        'contentId', analysis.id,
        'type', analysis.type,
        'summary', analysis.summary,
        'topics', JSON.stringify(analysis.topics),
        'entities', JSON.stringify(analysis.entities),
        'metadata', JSON.stringify(analysis.metadata),
        'timestamp', analysis.timestamp
      );

      this.logger.debug(`Stored content analysis: ${analysis.id}`);
    } catch (error) {
      this.logger.error('Failed to store analysis:', error);
    }
  }

  /**
   * Generate unique content ID
   */
  private generateContentId(): string {
    return `content-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Search similar content
   */
  async searchSimilar(query: string, limit: number = 5): Promise<ContentAnalysis[]> {
    // This would use vector similarity search in production
    // For now, return empty array
    return [];
  }
}