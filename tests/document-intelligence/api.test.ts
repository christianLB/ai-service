import request from 'supertest';
import { app } from '../../src/index';

describe('Document Intelligence API', () => {
  let documentId: string;

  describe('POST /api/documents/upload', () => {
    it('should upload a text document successfully', async () => {
      const testContent = 'This is a test document for API testing.';
      
      const response = await request(app)
        .post('/api/documents/upload')
        .attach('file', Buffer.from(testContent), 'test-document.txt')
        .field('userId', 'test-user')
        .field('autoAnalyze', 'false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.document.id).toBeDefined();
      expect(response.body.data.document.content.text).toBe(testContent);
      
      documentId = response.body.data.document.id;
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .field('userId', 'test-user')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file provided');
    });

    it('should reject unsupported file types', async () => {
      const testContent = 'executable content';
      
      const response = await request(app)
        .post('/api/documents/upload')
        .attach('file', Buffer.from(testContent), 'malicious.exe')
        .field('userId', 'test-user')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not allowed');
    });

    it('should respect file size limits', async () => {
      // Create a file larger than 50MB
      const largeContent = 'A'.repeat(51 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/documents/upload')
        .attach('file', Buffer.from(largeContent), 'large-file.txt')
        .field('userId', 'test-user')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File too large');
    });
  });

  describe('GET /api/documents', () => {
    it('should list documents', async () => {
      const response = await request(app)
        .get('/api/documents')
        .query({ userId: 'test-user' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toBeDefined();
      expect(Array.isArray(response.body.data.documents)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/documents')
        .query({ 
          userId: 'test-user',
          limit: 5,
          offset: 0
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.offset).toBe(0);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should get a specific document', async () => {
      const response = await request(app)
        .get(`/api/documents/${documentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.document.id).toBe(documentId);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/documents/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/documents/:id/analyze', () => {
    it('should analyze a document', async () => {
      // Skip if no OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI analysis test - no API key provided');
        return;
      }

      const response = await request(app)
        .post(`/api/documents/${documentId}/analyze`)
        .send({ includeEmbedding: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.processingTime).toBeGreaterThan(0);
    }, 60000);

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .post(`/api/documents/${fakeId}/analyze`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/documents/:id/question', () => {
    it('should answer questions about document', async () => {
      // Skip if no OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI question test - no API key provided');
        return;
      }

      const response = await request(app)
        .post(`/api/documents/${documentId}/question`)
        .send({ question: 'What is this document about?' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.answer).toBeDefined();
      expect(response.body.data.question).toBe('What is this document about?');
      expect(response.body.data.documentId).toBe(documentId);
    }, 30000);

    it('should require question parameter', async () => {
      const response = await request(app)
        .post(`/api/documents/${documentId}/question`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Question is required');
    });
  });

  describe('POST /api/documents/search', () => {
    it('should search documents', async () => {
      // Skip if no OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI search test - no API key provided');
        return;
      }

      const response = await request(app)
        .post('/api/documents/search')
        .send({ 
          query: 'test document',
          limit: 5
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeDefined();
      expect(Array.isArray(response.body.data.results)).toBe(true);
      expect(response.body.data.query).toBe('test document');
    }, 30000);

    it('should require query parameter', async () => {
      const response = await request(app)
        .post('/api/documents/search')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query parameter is required');
    });

    it('should support GET search', async () => {
      // Skip if no OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI search test - no API key provided');
        return;
      }

      const response = await request(app)
        .get('/api/documents/search')
        .query({ q: 'test', limit: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeDefined();
    }, 30000);
  });

  describe('GET /api/documents/stats/overview', () => {
    it('should return document statistics', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.storage).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();
    });
  });

  describe('GET /api/documents/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/documents/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('document-intelligence');
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete a document', async () => {
      const response = await request(app)
        .delete(`/api/documents/${documentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify document is deleted
      await request(app)
        .get(`/api/documents/${documentId}`)
        .expect(404);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .delete(`/api/documents/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/documents/search')
        .send('invalid json')
        .expect(400);

      // Should handle the error without crashing
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});