import { OpenAI } from 'openai';
import { getOpenAIClient } from '../openai';
import {
  Document,
  DocumentAnalysis,
  Entity,
  Topic,
  Sentiment,
  AnalysisProfile,
  EntityType,
} from '../../models/documents/types';
import { db as DatabaseService } from '../database';

export interface AnalysisOptions {
  profile?: AnalysisProfile;
  includeEmbedding?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface AnalysisResult {
  analysis: DocumentAnalysis;
  processingTime: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class OpenAIAnalysisService {
  private openai: OpenAI | null;
  private database: typeof DatabaseService;
  private defaultProfile: AnalysisProfile;

  constructor() {
    // Do not require OPENAI_API_KEY at startup. Lazily obtain client;
    // if not available, methods will no-op with safe defaults.
    this.openai = getOpenAIClient();
    this.database = DatabaseService;
    this.defaultProfile = {
      name: 'default',
      summaryLength: 'short',
      extractEntities: true,
      detectTopics: true,
      generateQuestions: true,
      detectSentiment: true,
      language: 'auto',
    };
  }

  async analyzeDocument(
    document: Document,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const profile = options.profile || this.defaultProfile;

    try {
      // Execute analysis tasks sequentially to maintain order
      let summary = '';
      let entities: Entity[] = [];
      let topics: Topic[] = [];
      let sentiments: Sentiment[] = [];
      let questions: string[] = [];
      let embedding: number[] | undefined = undefined;

      if (profile.summaryLength) {
        summary = await this.generateSummary(document.content.text, profile.summaryLength);
      }

      if (profile.extractEntities) {
        entities = await this.extractEntities(document.content.text);
      }

      if (profile.detectTopics) {
        topics = await this.detectTopics(document.content.text);
      }

      if (profile.generateQuestions) {
        questions = await this.generateQuestions(document.content.text);
      }

      if (profile.detectSentiment) {
        sentiments = await this.analyzeSentiment(document.content.text);
      }

      if (options.includeEmbedding) {
        embedding = await this.generateEmbedding(document.content.text);
      }

      // Combine results
      const analysis: DocumentAnalysis = {
        summary,
        entities,
        topics,
        sentiments,
        questions,
        embedding,
        processingTime: Date.now() - startTime,
        analysisProfile: profile.name,
      };

      // Store analysis in database
      await this.storeAnalysis(document.id, analysis);

      return {
        analysis,
        processingTime: Date.now() - startTime,
        tokenUsage: {
          promptTokens: 0, // Would need to track this from API responses
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error: any) {
      console.error('❌ Error analyzing document:', error);
      throw new Error(`Failed to analyze document: ${error.message}`);
    }
  }

  async generateSummary(text: string, length: 'short' | 'medium' | 'long'): Promise<string> {
    if (!this.openai) {
      return '';
    }
    const lengthInstructions = {
      short: 'in 2-3 sentences',
      medium: 'in 1-2 paragraphs',
      long: 'in 3-4 paragraphs with detailed insights',
    };

    const prompt = `
Please provide a clear, concise summary of the following document ${lengthInstructions[length]}. 
Focus on the main points, key insights, and important information.

Document:
${text.substring(0, 4000)}

Summary:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that creates clear, accurate summaries of documents.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: length === 'short' ? 150 : length === 'medium' ? 300 : 500,
        temperature: 0.3,
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error: any) {
      console.error('❌ Error generating summary:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  async extractEntities(text: string): Promise<Entity[]> {
    if (!this.openai) {
      return [];
    }
    const prompt = `
Extract named entities from the following text. Return a JSON array of entities with this structure:
[{"text": "entity text", "type": "entity_type", "confidence": 0.95}]

Entity types: person, organization, location, date, money, phone, email, url, product, event, other

Text:
${text.substring(0, 3000)}

Entities (JSON only):`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a precise entity extraction system. Return only valid JSON arrays.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
      });

      const content = response.choices[0].message.content?.trim() || '[]';
      const entities = JSON.parse(content);

      return entities.map((entity: any) => ({
        text: entity.text,
        type: this.mapEntityType(entity.type),
        confidence: entity.confidence || 0.8,
      }));
    } catch (error: any) {
      console.error('❌ Error extracting entities:', error);
      return [];
    }
  }

  async detectTopics(text: string): Promise<Topic[]> {
    if (!this.openai) {
      return [];
    }
    const prompt = `
Analyze the following text and identify the main topics. Return a JSON array with this structure:
[{"name": "topic name", "confidence": 0.9, "keywords": ["keyword1", "keyword2"]}]

Text:
${text.substring(0, 3000)}

Topics (JSON only):`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a topic detection system. Return only valid JSON arrays.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      });

      const content = response.choices[0].message.content?.trim() || '[]';
      const topics = JSON.parse(content);

      return topics.map((topic: any) => ({
        name: topic.name,
        confidence: topic.confidence || 0.7,
        keywords: topic.keywords || [],
      }));
    } catch (error: any) {
      console.error('❌ Error detecting topics:', error);
      return [];
    }
  }

  async generateQuestions(text: string): Promise<string[]> {
    if (!this.openai) {
      return [];
    }
    const prompt = `
Based on the following document, generate 3-5 insightful questions that would help someone understand the key points better. 
Return only the questions as a JSON array of strings.

Document:
${text.substring(0, 3000)}

Questions (JSON array only):`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a question generation system. Return only valid JSON arrays of strings.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.4,
      });

      const content = response.choices[0].message.content?.trim() || '[]';
      return JSON.parse(content);
    } catch (error: any) {
      console.error('❌ Error generating questions:', error);
      return [];
    }
  }

  async analyzeSentiment(text: string): Promise<Sentiment[]> {
    if (!this.openai) {
      return [{ label: 'neutral', confidence: 0.5 }];
    }
    const prompt = `
Analyze the sentiment of the following text. Return a JSON array with this structure:
[{"label": "positive/negative/neutral", "confidence": 0.85}]

Text:
${text.substring(0, 2000)}

Sentiment (JSON only):`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis system. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      });

      const content = response.choices[0].message.content?.trim() || '[]';
      return JSON.parse(content);
    } catch (error: any) {
      console.error('❌ Error analyzing sentiment:', error);
      return [{ label: 'neutral', confidence: 0.5 }];
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not configured');
    }
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit input length
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('❌ Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async answerQuestion(question: string, context: string): Promise<string> {
    if (!this.openai) {
      return '';
    }
    const prompt = `
Based on the following context, answer the question accurately and concisely.

Context:
${context.substring(0, 3000)}

Question: ${question}

Answer:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that answers questions based on provided context.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      return (
        response.choices[0].message.content?.trim() ||
        'I could not find an answer in the provided context.'
      );
    } catch (error: any) {
      console.error('❌ Error answering question:', error);
      throw new Error(`Failed to answer question: ${error.message}`);
    }
  }

  async searchSimilarDocuments(query: string, limit: number = 5): Promise<Document[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in database using cosine similarity
      const client = await this.database.pool.connect();

      try {
        const result = await client.query(
          `
          SELECT *, 
                 (analysis->>'embedding')::jsonb <=> $1::jsonb as distance
          FROM documents.documents 
          WHERE analysis->>'embedding' IS NOT NULL
          ORDER BY distance ASC
          LIMIT $2
        `,
          [JSON.stringify(queryEmbedding), limit]
        );

        return result.rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          type: row.type,
          format: row.format,
          content: row.content,
          metadata: row.metadata,
          analysis: row.analysis,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Error searching similar documents:', error);
      throw new Error(`Failed to search similar documents: ${error.message}`);
    }
  }

  private mapEntityType(type: string): EntityType {
    const typeMap: Record<string, EntityType> = {
      person: EntityType.PERSON,
      organization: EntityType.ORGANIZATION,
      location: EntityType.LOCATION,
      date: EntityType.DATE,
      money: EntityType.MONEY,
      phone: EntityType.PHONE,
      email: EntityType.EMAIL,
      url: EntityType.URL,
      product: EntityType.PRODUCT,
      event: EntityType.EVENT,
    };

    return typeMap[type.toLowerCase()] || EntityType.OTHER;
  }

  private async storeAnalysis(documentId: string, analysis: DocumentAnalysis): Promise<void> {
    const client = await this.database.pool.connect();

    try {
      await client.query(
        `
        UPDATE documents.documents 
        SET analysis = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [JSON.stringify(analysis), documentId]
      );
    } finally {
      client.release();
    }
  }

  async getAnalysisStats(): Promise<{
    totalDocuments: number;
    analyzedDocuments: number;
    averageProcessingTime: number;
    topTopics: { name: string; count: number }[];
  }> {
    const client = await this.database.pool.connect();

    try {
      const totalResult = await client.query(`
        SELECT COUNT(*) as total FROM documents.documents
      `);

      const analyzedResult = await client.query(`
        SELECT COUNT(*) as analyzed FROM documents.documents WHERE analysis IS NOT NULL
      `);

      const avgTimeResult = await client.query(`
        SELECT AVG((analysis->>'processingTime')::numeric) as avg_time
        FROM documents.documents 
        WHERE analysis IS NOT NULL
      `);

      return {
        totalDocuments: parseInt(totalResult.rows[0].total),
        analyzedDocuments: parseInt(analyzedResult.rows[0].analyzed),
        averageProcessingTime: parseFloat(avgTimeResult.rows[0].avg_time) || 0,
        topTopics: [], // Would need more complex query to aggregate topics
      };
    } finally {
      client.release();
    }
  }
}
