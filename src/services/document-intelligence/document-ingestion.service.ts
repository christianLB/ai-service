import { Document, DocumentContent, DocumentMetadata, DocumentType, FileFormat, DocumentSource, FileMetadata } from '../../models/documents/types';
import { DocumentModel } from '../../models/documents/document.model';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { db as DatabaseService } from '../database';

export interface ExtractedContent {
  text: string;
  pages?: number;
  wordCount?: number;
  language?: string;
}

export class DocumentIngestionService {
  private database: typeof DatabaseService;

  constructor() {
    this.database = DatabaseService;
  }

  async ingestDocument(file: Buffer, metadata: FileMetadata): Promise<Document> {
    const documentId = uuidv4();
    const startTime = Date.now();

    try {
      // 1. Detect file format
      const format = this.detectFileFormat(metadata.fileName);

      // 2. Extract content
      const extractedContent = await this.extractContent(file, format);

      // 3. Generate title
      const title = this.generateTitle(metadata.fileName, extractedContent.text);

      // 4. Detect document type
      const documentType = this.detectDocumentType(metadata.fileName, extractedContent.text);

      // 5. Create document content
      const content: DocumentContent = {
        text: extractedContent.text,
        pages: extractedContent.pages,
        wordCount: extractedContent.wordCount || extractedContent.text.split(/\s+/).length,
        language: extractedContent.language || 'en'
      };

      // 6. Create document metadata
      const docMetadata: DocumentMetadata = {
        fileName: metadata.fileName,
        fileSize: file.length,
        mimeType: this.getMimeType(format),
        source: metadata.source,
        userId: metadata.userId,
        tags: metadata.tags || [],
        parentId: metadata.parentId,
        version: 1
      };

      // 7. Create document model
      const document = new DocumentModel(
        documentId,
        title,
        documentType,
        format,
        content,
        docMetadata
      );

      // 8. Store document in database
      await this.storeDocument(document);

      // 9. Store file in filesystem
      const filePath = await this.storeFile(file, documentId, format);
      document.content.originalPath = filePath;

      // 10. Update document with file path
      await this.updateDocument(document);

      console.log(`📄 Document ingested successfully: ${title} (${Date.now() - startTime}ms)`);
      return document.toJSON();

    } catch (error: any) {
      console.error('❌ Error ingesting document:', error);
      throw new Error(`Failed to ingest document: ${error.message}`);
    }
  }

  private detectFileFormat(fileName: string): FileFormat {
    const extension = path.extname(fileName).toLowerCase();

    const formatMap: Record<string, FileFormat> = {
      '.pdf': FileFormat.PDF,
      '.docx': FileFormat.DOCX,
      '.doc': FileFormat.DOC,
      '.txt': FileFormat.TXT,
      '.rtf': FileFormat.RTF,
      '.html': FileFormat.HTML,
      '.htm': FileFormat.HTML,
      '.md': FileFormat.MARKDOWN,
      '.csv': FileFormat.CSV,
      '.xlsx': FileFormat.XLSX,
      '.xls': FileFormat.XLSX,
      '.pptx': FileFormat.PPTX,
      '.ppt': FileFormat.PPTX,
      '.jpg': FileFormat.IMAGE,
      '.jpeg': FileFormat.IMAGE,
      '.png': FileFormat.IMAGE,
      '.gif': FileFormat.IMAGE,
      '.bmp': FileFormat.IMAGE
    };

    return formatMap[extension] || FileFormat.TXT;
  }

  private getMimeType(format: FileFormat): string {
    const mimeMap: Record<FileFormat, string> = {
      [FileFormat.PDF]: 'application/pdf',
      [FileFormat.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [FileFormat.DOC]: 'application/msword',
      [FileFormat.TXT]: 'text/plain',
      [FileFormat.RTF]: 'application/rtf',
      [FileFormat.HTML]: 'text/html',
      [FileFormat.MARKDOWN]: 'text/markdown',
      [FileFormat.CSV]: 'text/csv',
      [FileFormat.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [FileFormat.PPTX]: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      [FileFormat.IMAGE]: 'image/jpeg'
    };

    return mimeMap[format] || 'application/octet-stream';
  }

  private async extractContent(file: Buffer, format: FileFormat): Promise<ExtractedContent> {
    try {
      switch (format) {
        case FileFormat.PDF:
          return await this.extractPDFContent(file);
        case FileFormat.DOCX:
          return await this.extractDocxContent(file);
        case FileFormat.TXT:
        case FileFormat.MARKDOWN:
          return await this.extractTextContent(file);
        case FileFormat.HTML:
          return await this.extractHTMLContent(file);
        default:
          // For unsupported formats, try to extract as text
          return await this.extractTextContent(file);
      }
    } catch (error: any) {
      console.error(`❌ Error extracting content from ${format}:`, error);
      // Fallback to raw text extraction
      return await this.extractTextContent(file);
    }
  }

  private async extractPDFContent(file: Buffer): Promise<ExtractedContent> {
    try {
      const data = await pdfParse(file);
      const text = data.text;
      const pages = data.numpages;

      return {
        text: text.trim(),
        pages: pages,
        wordCount: text.split(/\s+/).length
      };
    } catch (error: any) {
      console.warn('PDF parsing failed, using fallback:', error.message);

      // Fallback to placeholder if PDF parsing fails
      const text = `PDF Document Content (${file.length} bytes)
      
This PDF file was uploaded successfully but could not be parsed automatically.
Content extraction failed with error: ${error.message}`;

      return {
        text: text.trim(),
        pages: 1,
        wordCount: text.split(/\s+/).length
      };
    }
  }

  private async extractDocxContent(file: Buffer): Promise<ExtractedContent> {
    const result = await mammoth.extractRawText({ buffer: file });
    const text = result.value;

    return {
      text: text.trim(),
      wordCount: text.split(/\s+/).length
    };
  }

  private async extractTextContent(file: Buffer): Promise<ExtractedContent> {
    const text = file.toString('utf-8');

    return {
      text: text.trim(),
      wordCount: text.split(/\s+/).length
    };
  }

  private async extractHTMLContent(file: Buffer): Promise<ExtractedContent> {
    const html = file.toString('utf-8');
    // Simple HTML tag removal
    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    return {
      text,
      wordCount: text.split(/\s+/).length
    };
  }

  private generateTitle(fileName: string, content: string): string {
    // Try to extract title from content first
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length > 0) {
      const firstLine = lines[0];
      // If first line is reasonably short and looks like a title
      if (firstLine.length < 100 && firstLine.length > 5) {
        return firstLine;
      }
    }

    // Fallback to filename without extension
    const baseName = path.basename(fileName, path.extname(fileName));
    return baseName.replace(/[-_]/g, ' ').trim();
  }

  private detectDocumentType(fileName: string, content: string): DocumentType {
    const lowerFileName = fileName.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Check filename patterns
    if (lowerFileName.includes('invoice') || lowerFileName.includes('factura')) {
      return DocumentType.INVOICE;
    }
    if (lowerFileName.includes('contract') || lowerFileName.includes('contrato')) {
      return DocumentType.CONTRACT;
    }
    if (lowerFileName.includes('report') || lowerFileName.includes('reporte')) {
      return DocumentType.REPORT;
    }
    if (lowerFileName.includes('presentation') || lowerFileName.includes('presentacion')) {
      return DocumentType.PRESENTATION;
    }
    if (lowerFileName.includes('manual') || lowerFileName.includes('guide')) {
      return DocumentType.MANUAL;
    }

    // Check content patterns
    if (lowerContent.includes('invoice') || lowerContent.includes('total amount')) {
      return DocumentType.INVOICE;
    }
    if (lowerContent.includes('abstract') || lowerContent.includes('research')) {
      return DocumentType.RESEARCH;
    }
    if (lowerContent.includes('hereby agree') || lowerContent.includes('terms and conditions')) {
      return DocumentType.CONTRACT;
    }

    return DocumentType.OTHER;
  }

  private async storeFile(file: Buffer, documentId: string, format: FileFormat): Promise<string> {
    const extension = this.getFileExtension(format);
    const fileName = `${documentId}.${extension}`;
    const basePath = process.env.DOCUMENT_STORAGE_PATH || path.join(process.cwd(), 'data', 'documents', 'storage');
    const filePath = path.join(basePath, fileName);

    await fs.writeFile(filePath, file);
    return filePath;
  }

  private getFileExtension(format: FileFormat): string {
    const extensionMap: Record<FileFormat, string> = {
      [FileFormat.PDF]: 'pdf',
      [FileFormat.DOCX]: 'docx',
      [FileFormat.DOC]: 'doc',
      [FileFormat.TXT]: 'txt',
      [FileFormat.RTF]: 'rtf',
      [FileFormat.HTML]: 'html',
      [FileFormat.MARKDOWN]: 'md',
      [FileFormat.CSV]: 'csv',
      [FileFormat.XLSX]: 'xlsx',
      [FileFormat.PPTX]: 'pptx',
      [FileFormat.IMAGE]: 'jpg'
    };

    return extensionMap[format] || 'txt';
  }

  private async storeDocument(document: DocumentModel): Promise<void> {
    const client = await this.database.pool.connect();

    try {
      await client.query('BEGIN');

      // Create documents schema if it doesn't exist
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS documents
      `);

      // Create documents table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS documents.documents (
          id UUID PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          type VARCHAR(50) NOT NULL,
          format VARCHAR(20) NOT NULL,
          content JSONB NOT NULL,
          metadata JSONB NOT NULL,
          analysis JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert document
      await client.query(`
        INSERT INTO documents.documents (
          id, title, type, format, content, metadata, analysis, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        document.id,
        document.title,
        document.type,
        document.format,
        JSON.stringify(document.content),
        JSON.stringify(document.metadata),
        document.analysis ? JSON.stringify(document.analysis) : null,
        document.createdAt,
        document.updatedAt
      ]);

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateDocument(document: DocumentModel): Promise<void> {
    const client = await this.database.pool.connect();

    try {
      await client.query(`
        UPDATE documents.documents 
        SET content = $1, updated_at = $2
        WHERE id = $3
      `, [
        JSON.stringify(document.content),
        document.updatedAt,
        document.id
      ]);
    } finally {
      client.release();
    }
  }

  async getDocument(id: string): Promise<Document | null> {
    const client = await this.database.pool.connect();

    try {
      const result = await client.query(`
        SELECT * FROM documents.documents WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        type: row.type,
        format: row.format,
        content: row.content,
        metadata: row.metadata,
        analysis: row.analysis,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      client.release();
    }
  }

  async listDocuments(userId?: string, limit: number = 50, offset: number = 0): Promise<Document[]> {
    const client = await this.database.pool.connect();

    try {
      let query = `
        SELECT * FROM documents.documents
        WHERE 1=1
      `;
      const params: any[] = [];

      if (userId) {
        query += ` AND metadata->>'userId' = $${params.length + 1}`;
        params.push(userId);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        format: row.format,
        content: row.content,
        metadata: row.metadata,
        analysis: row.analysis,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      client.release();
    }
  }

  async deleteDocument(id: string): Promise<void> {
    const client = await this.database.pool.connect();

    try {
      await client.query('BEGIN');

      // Get document to find file path
      const result = await client.query(`
        SELECT content FROM documents.documents WHERE id = $1
      `, [id]);

      if (result.rows.length > 0) {
        const content = result.rows[0].content;
        if (content.originalPath) {
          try {
            await fs.unlink(content.originalPath);
          } catch (error: any) {
            console.warn('Warning: Could not delete file:', error.message);
          }
        }
      }

      // Delete from database
      await client.query(`
        DELETE FROM documents.documents WHERE id = $1
      `, [id]);

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}