import { OpenAIAnalysisService } from '../../src/services/document-intelligence/openai-analysis.service';
import { DocumentIngestionService } from '../../src/services/document-intelligence/document-ingestion.service';
import { DocumentSource } from '../../src/models/documents/types';

describe('OpenAI Analysis Service', () => {
  let analysisService: OpenAIAnalysisService;
  let ingestionService: DocumentIngestionService;

  beforeAll(() => {
    analysisService = new OpenAIAnalysisService();
    ingestionService = new DocumentIngestionService();
  });

  describe('Document Analysis', () => {
    it('should generate summary for a document', async () => {
      // Skip if no OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      const testContent = `
        Artificial Intelligence in Healthcare
        
        Artificial intelligence (AI) is revolutionizing healthcare by improving diagnosis accuracy,
        personalizing treatment plans, and streamlining administrative processes. Machine learning
        algorithms can analyze medical images, predict patient outcomes, and assist in drug discovery.
        
        Key benefits include:
        - Faster and more accurate diagnoses
        - Personalized treatment recommendations
        - Reduced healthcare costs
        - Improved patient outcomes
        
        However, challenges remain including data privacy, algorithm bias, and the need for
        regulatory frameworks to ensure safe implementation.
      `;

      const testBuffer = Buffer.from(testContent, 'utf-8');
      const document = await ingestionService.ingestDocument(testBuffer, {
        fileName: 'ai-healthcare-report.txt',
        source: DocumentSource.API,
        userId: 'test-user'
      });

      const analysisResult = await analysisService.analyzeDocument(document, {
        includeEmbedding: false // Skip embedding for faster testing
      });

      expect(analysisResult.analysis).toBeDefined();
      expect(analysisResult.analysis.summary).toBeDefined();
      expect(analysisResult.analysis.summary.length).toBeGreaterThan(10);
      expect(analysisResult.processingTime).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for OpenAI calls

    it('should extract entities from document', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      const testContent = `
        Meeting Minutes - Project Alpha
        Date: January 15, 2024
        Attendees: John Smith (john@company.com), Sarah Johnson, Mike Wilson
        Location: San Francisco Office
        
        The team discussed the Q1 budget of $500,000 and the upcoming launch
        scheduled for March 2024. Contact details: +1-555-0123
      `;

      const summary = await analysisService.generateSummary(testContent, 'short');
      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);

      const entities = await analysisService.extractEntities(testContent);
      expect(entities).toBeDefined();
      expect(Array.isArray(entities)).toBe(true);
      
      // Should extract names, dates, money, etc.
      if (entities.length > 0) {
        entities.forEach(entity => {
          expect(entity.text).toBeDefined();
          expect(entity.type).toBeDefined();
          expect(entity.confidence).toBeGreaterThan(0);
        });
      }
    }, 30000);

    it('should detect topics in document', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      const testContent = `
        Climate Change and Renewable Energy Solutions
        
        The urgent need to address climate change has accelerated the development
        of renewable energy technologies. Solar panels, wind turbines, and battery
        storage systems are becoming more efficient and cost-effective.
        
        Government policies and investment in green technology are driving
        the transition away from fossil fuels. Carbon emissions reduction
        and sustainability initiatives are now corporate priorities.
      `;

      const topics = await analysisService.detectTopics(testContent);
      expect(topics).toBeDefined();
      expect(Array.isArray(topics)).toBe(true);
      
      if (topics.length > 0) {
        topics.forEach(topic => {
          expect(topic.name).toBeDefined();
          expect(topic.confidence).toBeGreaterThan(0);
          expect(Array.isArray(topic.keywords)).toBe(true);
        });
      }
    }, 30000);

    it('should generate relevant questions', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      const testContent = `
        Company Financial Results Q4 2023
        
        Revenue increased 15% year-over-year to $2.5 billion.
        Net profit margin improved to 12% from 10% in the previous quarter.
        The company acquired two startups for a total of $50 million.
        Employee headcount grew by 200 people across all departments.
      `;

      const questions = await analysisService.generateQuestions(testContent);
      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      
      questions.forEach(question => {
        expect(typeof question).toBe('string');
        expect(question.length).toBeGreaterThan(10);
        expect(question).toMatch(/\?$/); // Should end with question mark
      });
    }, 30000);

    it('should analyze sentiment', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      const positiveContent = `
        Excellent results this quarter! Our team exceeded all targets and
        customer satisfaction is at an all-time high. Great job everyone!
      `;

      const sentiments = await analysisService.analyzeSentiment(positiveContent);
      expect(sentiments).toBeDefined();
      expect(Array.isArray(sentiments)).toBe(true);
      expect(sentiments.length).toBeGreaterThan(0);
      
      sentiments.forEach(sentiment => {
        expect(['positive', 'negative', 'neutral']).toContain(sentiment.label);
        expect(sentiment.confidence).toBeGreaterThan(0);
        expect(sentiment.confidence).toBeLessThanOrEqual(1);
      });
    }, 30000);
  });

  describe('Question Answering', () => {
    it('should answer questions about document content', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      const context = `
        The company was founded in 2010 by Jane Doe and John Smith.
        It started as a small software consultancy with 5 employees.
        Today, the company has grown to over 500 employees across 10 offices
        worldwide and generates annual revenue of $100 million.
      `;

      const question = "When was the company founded and by whom?";
      const answer = await analysisService.answerQuestion(question, context);

      expect(answer).toBeDefined();
      expect(answer.length).toBeGreaterThan(10);
      expect(answer.toLowerCase()).toContain('2010');
      expect(answer.toLowerCase()).toContain('jane doe');
      expect(answer.toLowerCase()).toContain('john smith');
    }, 30000);

    it('should handle questions not answerable from context', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      const context = `
        The weather today is sunny with a temperature of 75°F.
        It's a great day for outdoor activities.
      `;

      const question = "What is the company's revenue?";
      const answer = await analysisService.answerQuestion(question, context);

      expect(answer).toBeDefined();
      // Should indicate that the information is not available in the context
      expect(answer.toLowerCase()).toContain('not' || 'cannot' || 'unable');
    }, 30000);
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings for text', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      const testText = 'This is a test document for embedding generation.';
      const embedding = await analysisService.generateEmbedding(testText);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(1000); // OpenAI embeddings are typically 1536 dimensions
      
      // All values should be numbers
      embedding.forEach(value => {
        expect(typeof value).toBe('number');
      });
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      // Test with very long content that might exceed token limits
      const veryLongContent = 'A'.repeat(100000);

      // Should not throw, but handle gracefully
      const summary = await analysisService.generateSummary(veryLongContent, 'short');
      expect(summary).toBeDefined();
    }, 30000);

    it('should handle malformed JSON responses', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI tests - no API key provided');
        return;
      }

      // This test would require mocking the OpenAI API to return malformed JSON
      // For now, we'll just test that the method exists and returns sensible defaults
      const entities = await analysisService.extractEntities('');
      expect(Array.isArray(entities)).toBe(true);
    }, 30000);
  });
});