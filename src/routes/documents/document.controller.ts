import { Request, Response } from 'express';
import { DocumentIngestionService } from '../../services/document-intelligence/document-ingestion.service';
import { OpenAIAnalysisService } from '../../services/document-intelligence/openai-analysis.service';
import { DocumentStorageService } from '../../services/document-intelligence/storage.service';
import { DocumentSource, SearchRequest } from '../../models/documents/types';
import { logger } from '../../utils/log';

export class DocumentController {
  private ingestionService: DocumentIngestionService;
  private analysisService: OpenAIAnalysisService;
  private storageService: DocumentStorageService;

  constructor() {
    this.ingestionService = new DocumentIngestionService();
    this.analysisService = new OpenAIAnalysisService();
    this.storageService = new DocumentStorageService({
      basePath: process.env.DOCUMENT_STORAGE_PATH
    });
  }

  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file provided'
        });
        return;
      }

      const startTime = Date.now();
      
      // Ingest document
      const document = await this.ingestionService.ingestDocument(req.file.buffer, {
        fileName: req.file.originalname,
        source: DocumentSource.WEB,
        userId: req.body.userId || 'anonymous',
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      });

      // Auto-analyze if requested
      let analysis = undefined;
      if (req.body.autoAnalyze !== 'false') {
        const analysisResult = await this.analysisService.analyzeDocument(document, {
          includeEmbedding: true
        });
        analysis = analysisResult.analysis;
      }

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          document,
          analysis,
          processingTime
        }
      });

    } catch (error: any) {
      logger.error('Error uploading document:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload document'
      });
    }
  }

  async listDocuments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const documents = await this.ingestionService.listDocuments(userId, limit, offset);

      res.json({
        success: true,
        data: {
          documents,
          pagination: {
            limit,
            offset,
            total: documents.length
          }
        }
      });

    } catch (error: any) {
      logger.error('Error listing documents:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list documents'
      });
    }
  }

  async getDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const document = await this.ingestionService.getDocument(id);
      
      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { document }
      });

    } catch (error: any) {
      logger.error('Error getting document:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get document'
      });
    }
  }

  async getDocumentAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const document = await this.ingestionService.getDocument(id);
      
      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found'
        });
        return;
      }

      if (!document.analysis) {
        res.status(404).json({
          success: false,
          error: 'Document analysis not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { analysis: document.analysis }
      });

    } catch (error: any) {
      logger.error('Error getting document analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get document analysis'
      });
    }
  }

  async analyzeDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const document = await this.ingestionService.getDocument(id);
      
      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found'
        });
        return;
      }

      const analysisResult = await this.analysisService.analyzeDocument(document, {
        includeEmbedding: req.body.includeEmbedding !== false,
        profile: req.body.profile
      });

      res.json({
        success: true,
        data: {
          analysis: analysisResult.analysis,
          processingTime: analysisResult.processingTime,
          tokenUsage: analysisResult.tokenUsage
        }
      });

    } catch (error: any) {
      logger.error('Error analyzing document:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze document'
      });
    }
  }

  async searchDocuments(req: Request, res: Response): Promise<void> {
    try {
      const searchRequest: SearchRequest = {
        query: req.body.query || req.query.q as string,
        limit: parseInt(req.body.limit || req.query.limit as string) || 10,
        offset: parseInt(req.body.offset || req.query.offset as string) || 0,
        userId: req.body.userId || req.query.userId as string,
        filters: req.body.filters
      };

      if (!searchRequest.query) {
        res.status(400).json({
          success: false,
          error: 'Query parameter is required'
        });
        return;
      }

      const results = await this.analysisService.searchSimilarDocuments(
        searchRequest.query,
        searchRequest.limit
      );

      res.json({
        success: true,
        data: {
          results,
          query: searchRequest.query,
          pagination: {
            limit: searchRequest.limit,
            offset: searchRequest.offset,
            total: results.length
          }
        }
      });

    } catch (error: any) {
      logger.error('Error searching documents:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search documents'
      });
    }
  }

  async answerQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { question } = req.body;

      if (!question) {
        res.status(400).json({
          success: false,
          error: 'Question is required'
        });
        return;
      }

      const document = await this.ingestionService.getDocument(id);
      
      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found'
        });
        return;
      }

      const answer = await this.analysisService.answerQuestion(
        question,
        document.content.text
      );

      res.json({
        success: true,
        data: {
          question,
          answer,
          documentId: id,
          documentTitle: document.title
        }
      });

    } catch (error: any) {
      logger.error('Error answering question:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to answer question'
      });
    }
  }

  async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const document = await this.ingestionService.getDocument(id);
      
      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found'
        });
        return;
      }

      await this.ingestionService.deleteDocument(id);

      res.json({
        success: true,
        data: { message: 'Document deleted successfully' }
      });

    } catch (error: any) {
      logger.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete document'
      });
    }
  }

  async getDocumentStats(req: Request, res: Response): Promise<void> {
    try {
      const analysisStats = await this.analysisService.getAnalysisStats();
      const storageStats = await this.storageService.getStorageStats();

      res.json({
        success: true,
        data: {
          analysis: analysisStats,
          storage: storageStats,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error: any) {
      logger.error('Error getting document stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get document stats'
      });
    }
  }

  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const { token, expires } = req.query;

      // Validate access token if provided
      if (token && expires) {
        const isValid = this.storageService.validateAccessToken(token as string);
        if (!isValid.isValid) {
          res.status(403).json({
            success: false,
            error: 'Invalid or expired access token'
          });
          return;
        }

        if (parseInt(expires as string) < Date.now()) {
          res.status(403).json({
            success: false,
            error: 'Access token expired'
          });
          return;
        }
      }

      const fileBuffer = await this.storageService.downloadFile(filename);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(fileBuffer);

    } catch (error: any) {
      logger.error('Error downloading file:', error);
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
  }

  async getSignedUrl(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const expiresIn = parseInt(req.query.expiresIn as string) || 3600;
      const action = req.query.action as 'read' | 'write' | 'delete' || 'read';

      const signedUrl = await this.storageService.getSignedUrl(filename, {
        expiresIn,
        action
      });

      res.json({
        success: true,
        data: {
          signedUrl,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        }
      });

    } catch (error: any) {
      logger.error('Error generating signed URL:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate signed URL'
      });
    }
  }
}