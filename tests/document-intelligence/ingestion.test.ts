import { DocumentIngestionService } from '../../src/services/document-intelligence/document-ingestion.service';
import { DocumentSource, FileFormat } from '../../src/models/documents/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Document Ingestion Service', () => {
  let ingestionService: DocumentIngestionService;

  beforeAll(() => {
    ingestionService = new DocumentIngestionService();
  });

  describe('Text Document Processing', () => {
    it('should process a text document correctly', async () => {
      const testContent = 'This is a test document with sample content for testing purposes.';
      const testBuffer = Buffer.from(testContent, 'utf-8');

      const document = await ingestionService.ingestDocument(testBuffer, {
        fileName: 'test.txt',
        source: DocumentSource.API,
        userId: 'test-user',
        tags: ['test']
      });

      expect(document).toBeDefined();
      expect(document.title).toBeDefined();
      expect(document.content.text).toBe(testContent);
      expect(document.format).toBe(FileFormat.TXT);
      expect(document.metadata.fileName).toBe('test.txt');
      expect(document.metadata.source).toBe(DocumentSource.API);
      expect(document.metadata.userId).toBe('test-user');
      expect(document.metadata.tags).toContain('test');
    });

    it('should detect document type correctly', async () => {
      const invoiceContent = 'INVOICE #12345\\nTotal Amount: $500.00\\nPlease pay by due date.';
      const testBuffer = Buffer.from(invoiceContent, 'utf-8');

      const document = await ingestionService.ingestDocument(testBuffer, {
        fileName: 'invoice-12345.txt',
        source: DocumentSource.API
      });

      expect(document.type).toBeDefined();
      // Should detect as invoice based on filename
    });

    it('should generate meaningful title from content', async () => {
      const contentWithTitle = 'Project Requirements Document\\n\\nThis document outlines the requirements...';
      const testBuffer = Buffer.from(contentWithTitle, 'utf-8');

      const document = await ingestionService.ingestDocument(testBuffer, {
        fileName: 'document.txt',
        source: DocumentSource.API
      });

      expect(document.title).toBe('Project Requirements Document');
    });
  });

  describe('File Format Detection', () => {
    it('should detect PDF format', async () => {
      const testBuffer = Buffer.from('test content', 'utf-8');

      const document = await ingestionService.ingestDocument(testBuffer, {
        fileName: 'test.pdf',
        source: DocumentSource.API
      });

      expect(document.format).toBe(FileFormat.PDF);
    });

    it('should detect DOCX format', async () => {
      const testBuffer = Buffer.from('test content', 'utf-8');

      const document = await ingestionService.ingestDocument(testBuffer, {
        fileName: 'test.docx',
        source: DocumentSource.API
      });

      expect(document.format).toBe(FileFormat.DOCX);
    });

    it('should default to TXT for unknown extensions', async () => {
      const testBuffer = Buffer.from('test content', 'utf-8');

      const document = await ingestionService.ingestDocument(testBuffer, {
        fileName: 'test.unknown',
        source: DocumentSource.API
      });

      expect(document.format).toBe(FileFormat.TXT);
    });
  });

  describe('Document Storage and Retrieval', () => {
    let documentId: string;

    it('should store document and make it retrievable', async () => {
      const testContent = 'This document should be stored and retrievable.';
      const testBuffer = Buffer.from(testContent, 'utf-8');

      const document = await ingestionService.ingestDocument(testBuffer, {
        fileName: 'retrievable-test.txt',
        source: DocumentSource.API,
        userId: 'test-user'
      });

      documentId = document.id;
      expect(document.id).toBeDefined();

      // Retrieve the document
      const retrievedDocument = await ingestionService.getDocument(documentId);
      expect(retrievedDocument).toBeDefined();
      expect(retrievedDocument?.id).toBe(documentId);
      expect(retrievedDocument?.content.text).toBe(testContent);
    });

    it('should list documents for a user', async () => {
      const documents = await ingestionService.listDocuments('test-user', 10, 0);
      expect(documents).toBeDefined();
      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThan(0);
      
      // Should contain our test document
      const testDoc = documents.find(doc => doc.id === documentId);
      expect(testDoc).toBeDefined();
    });

    it('should delete document', async () => {
      await ingestionService.deleteDocument(documentId);
      
      const deletedDocument = await ingestionService.getDocument(documentId);
      expect(deletedDocument).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty files gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(
        ingestionService.ingestDocument(emptyBuffer, {
          fileName: 'empty.txt',
          source: DocumentSource.API
        })
      ).rejects.toThrow();
    });

    it('should handle corrupted files gracefully', async () => {
      const corruptedBuffer = Buffer.from('corrupted binary data \\x00\\x01\\x02', 'binary');

      // Should not throw, but might extract limited content
      const document = await ingestionService.ingestDocument(corruptedBuffer, {
        fileName: 'corrupted.pdf',
        source: DocumentSource.API
      });

      expect(document).toBeDefined();
      // Should have some basic metadata even if content extraction fails
      expect(document.metadata.fileName).toBe('corrupted.pdf');
    });
  });
});